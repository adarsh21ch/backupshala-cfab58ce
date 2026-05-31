// run-weekly-payouts
// Weekly automatic payout run. Gathers every eligible user's withdrawable
// balance and creates payout REQUESTS for them (admin still approves + sends
// the money — this does NOT auto-transfer to bank accounts).
//
// Auth (one of):
//   - Cron:  header `x-cron-secret` == app_config.cron_secret
//   - Admin: a logged-in admin's JWT (for the "Run now" button)
//
// Idempotent per ISO week via the payout_runs table (run_key UNIQUE).
// Tolerates partial failure: one user failing does not abort the run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createPayout } from "../_shared/create-payout.ts";
import { emailTpl, sendEmail, logSystemError } from "../_shared/emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ISO-8601 week key, e.g. "2026-W23" (UTC).
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    const force = body?.force === true;

    // ---------- Authorize ----------
    let triggeredBy = "cron";
    let authorized = false;

    const cronSecretHeader = req.headers.get("x-cron-secret");
    if (cronSecretHeader) {
      const { data: cfg } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "cron_secret")
        .maybeSingle();
      if (cfg?.value && cfg.value === cronSecretHeader) {
        authorized = true;
        triggeredBy = "cron";
      }
    }

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const jwt = authHeader.replace(/^Bearer\s+/i, "");
        const { data: { user } } = await supabase.auth.getUser(jwt);
        if (user) {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
          });
          if (isAdmin) {
            authorized = true;
            triggeredBy = `admin:${user.id}`;
          }
        }
      }
    }

    if (!authorized) return json({ error: "Unauthorized" }, 401);

    // ---------- Settings ----------
    const { data: settingsRows } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "auto_payout_enabled",
        "auto_payout_min_amount",
        "auto_payout_day_of_week",
        "auto_payout_hour_utc",
      ]);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r) => { settings[r.key] = r.value; });

    const globallyEnabled = (settings.auto_payout_enabled ?? "true") === "true";
    const minAmount = Number(settings.auto_payout_min_amount ?? "500") || 500;
    const payoutDay = Number(settings.auto_payout_day_of_week ?? "1");

    if (!globallyEnabled && !force) {
      return json({ skipped: true, reason: "auto_payout disabled globally" });
    }

    // ---------- Day gate (skip unless forced) ----------
    const now = new Date();
    if (!force && now.getUTCDay() !== payoutDay) {
      return json({
        skipped: true,
        reason: `today (UTC day ${now.getUTCDay()}) is not the configured payout day (${payoutDay})`,
      });
    }

    const runKey = isoWeekKey(now);

    // ---------- Idempotency: claim this week's run ----------
    const { data: claimed, error: claimErr } = await supabase
      .from("payout_runs")
      .insert({ run_key: runKey, status: "running", triggered_by: triggeredBy })
      .select("id")
      .maybeSingle();

    let runId: string | undefined = claimed?.id;

    if (claimErr) {
      // Already exists for this week — inspect it.
      const { data: existingRun } = await supabase
        .from("payout_runs")
        .select("id, status, users_processed, total_amount")
        .eq("run_key", runKey)
        .maybeSingle();

      if (existingRun?.status === "completed") {
        return json({
          skipped: true,
          reason: "already completed this week",
          run_key: runKey,
          users_processed: existingRun.users_processed,
          total_amount: existingRun.total_amount,
        });
      }
      if (existingRun?.status === "running") {
        return json({ skipped: true, reason: "a run for this week is already in progress", run_key: runKey });
      }
      // status 'failed' → resume by reusing the row
      runId = existingRun?.id;
      if (runId) {
        await supabase.from("payout_runs")
          .update({ status: "running", started_at: now.toISOString(), errors: [] })
          .eq("id", runId);
      }
    }

    if (!runId) return json({ error: "Could not start payout run" }, 500);

    // ---------- Candidate users ----------
    const { data: candidates } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, auto_payout_enabled, pan_number, " +
        "payout_upi_id, payout_bank_name, payout_account_holder, payout_account_number, payout_ifsc_code",
      )
      .eq("auto_payout_enabled", true)
      .not("pan_number", "is", null);

    const errors: Array<{ user_id: string; error: string }> = [];
    let usersProcessed = 0;
    let totalAmount = 0;

    for (const p of candidates || []) {
      try {
        // PAN sanity
        if (!p.pan_number) continue;

        // Determine method from saved details (prefer bank).
        const hasBank = !!(p.payout_bank_name && p.payout_account_holder &&
          p.payout_account_number && p.payout_ifsc_code);
        const hasUpi = !!p.payout_upi_id;
        if (!hasBank && !hasUpi) continue; // no saved payout details

        // Withdrawable balance (single source of truth).
        const { data: avail, error: availErr } = await supabase.rpc(
          "wallet_available_balance",
          { _user_id: p.id },
        );
        if (availErr) throw new Error(availErr.message);
        const withdrawable = Math.floor(Number(avail) || 0); // whole rupees
        if (withdrawable < minAmount) continue;

        const method: "bank" | "upi" = hasBank ? "bank" : "upi";

        const result = await createPayout(supabase, {
          userId: p.id,
          requestType: "wallet_withdrawal",
          amount: withdrawable,
          method,
          source: "auto_weekly",
          pan_number: p.pan_number,
          upi_id: method === "upi" ? p.payout_upi_id! : undefined,
          bank_name: method === "bank" ? p.payout_bank_name! : undefined,
          account_holder_name: method === "bank" ? p.payout_account_holder! : undefined,
          account_number: method === "bank" ? p.payout_account_number! : undefined,
          ifsc_code: method === "bank" ? p.payout_ifsc_code! : undefined,
        });

        if (!result.ok) {
          // 409 = already has an open request → expected skip, not an error.
          if (result.status !== 409) {
            errors.push({ user_id: p.id, error: result.error || "unknown" });
          }
          continue;
        }

        usersProcessed += 1;
        totalAmount += withdrawable;

        // Notification (best effort)
        await supabase.from("notifications").insert({
          user_id: p.id,
          title: "Weekly payout queued 💸",
          message: `Your weekly payout of ₹${withdrawable} has been queued. It will be processed within 3–5 business days.`,
          type: "success",
          action_url: "/dashboard/wallet",
        }).then(() => {}, () => {});

        // Email (best effort)
        if (p.email) {
          await sendEmail(
            supabase,
            p.email,
            emailTpl.weeklyPayoutQueued(p.full_name || "", withdrawable, method.toUpperCase()),
          );
        }
      } catch (e) {
        errors.push({ user_id: p.id, error: (e as Error).message || String(e) });
      }
    }

    // ---------- Finalize run ----------
    await supabase.from("payout_runs").update({
      status: "completed",
      users_processed: usersProcessed,
      total_amount: totalAmount,
      errors,
      finished_at: new Date().toISOString(),
    }).eq("id", runId);

    // ---------- Audit log ----------
    await supabase.from("admin_audit_log").insert({
      admin_id: "00000000-0000-0000-0000-000000000000",
      action: "run_weekly_payouts",
      target_type: "payout_run",
      target_id: runKey,
      details: {
        triggered_by: triggeredBy,
        users_processed: usersProcessed,
        total_amount: totalAmount,
        error_count: errors.length,
        forced: force,
      },
    }).then(() => {}, () => {});

    return json({
      success: true,
      run_key: runKey,
      users_processed: usersProcessed,
      total_amount: totalAmount,
      errors,
    });
  } catch (e) {
    await logSystemError(supabase, "run-weekly-payouts", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
