// Single edge function handling admin payout transitions:
//   action = 'set_processing' | 'complete' | 'reject'
// Server-side admin check, atomic state transition via Postgres RPCs that only
// flip from allowed previous statuses, and audit log writes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "set_processing" | "complete" | "reject";

interface Body {
  action: Action;
  payout_id: string;
  utr?: string;
  admin_note?: string;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json({ error: "Invalid token" }, 401);

    // Admin check (server-side, never trust client)
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.action || !body?.payout_id) {
      return json({ error: "action and payout_id required" }, 400);
    }

    // Snapshot for audit + emails
    const { data: payout } = await supabase
      .from("payout_requests")
      .select("id, user_id, amount, status, request_type")
      .eq("id", body.payout_id)
      .maybeSingle();
    if (!payout) return json({ error: "Payout request not found" }, 404);

    const { data: prof } = await supabase
      .from("profiles").select("email, full_name").eq("id", payout.user_id).maybeSingle();

    if (body.action === "set_processing") {
      const { data: ok, error } = await supabase.rpc("admin_payout_set_processing", {
        _payout_id: body.payout_id, _admin_id: user.id,
      });
      if (error) return json({ error: error.message }, 500);
      if (!ok) {
        return json({ error: "Payout is no longer pending" }, 409);
      }
      await audit(supabase, user.id, "payout_set_processing", body.payout_id, {
        amount: payout.amount, user_id: payout.user_id,
      });
      return json({ success: true, status: "processing" });
    }

    if (body.action === "complete") {
      const utr = (body.utr || "").trim();
      if (!utr) return json({ error: "UTR number is required" }, 400);

      const { data: ok, error } = await supabase.rpc("admin_payout_complete", {
        _payout_id: body.payout_id,
        _admin_id: user.id,
        _utr: utr,
        _admin_note: body.admin_note || null,
      });
      if (error) return json({ error: error.message }, 500);
      if (!ok) return json({ error: "Payout already finalized by another admin" }, 409);

      await audit(supabase, user.id, "payout_completed", body.payout_id, {
        amount: payout.amount, user_id: payout.user_id, utr_number: utr,
        admin_note: body.admin_note || null,
      });

      await supabase.from("notifications").insert({
        user_id: payout.user_id,
        title: `Withdrawal of ₹${payout.amount} processed ✅`,
        message: `Your withdrawal has been processed (UTR ${utr}). Allow up to 1 business day to reflect.`,
        type: "payout",
      });
      try {
        if (prof?.email) {
          const { emailTpl, sendEmail } = await import("../_shared/emails.ts");
          await sendEmail(supabase, prof.email,
            emailTpl.payoutApproved(prof.full_name, Number(payout.amount), utr));
        }
      } catch (e) { console.error("payout email failed", e); }

      return json({ success: true, status: "paid" });
    }

    if (body.action === "reject") {
      const reason = (body.reason || "").trim();
      if (!reason) return json({ error: "Rejection reason is required" }, 400);

      const { data: ok, error } = await supabase.rpc("admin_payout_reject", {
        _payout_id: body.payout_id, _admin_id: user.id, _reason: reason,
      });
      if (error) return json({ error: error.message }, 500);
      if (!ok) return json({ error: "Payout already finalized by another admin" }, 409);

      await audit(supabase, user.id, "payout_rejected", body.payout_id, {
        amount: payout.amount, user_id: payout.user_id, reason,
      });

      await supabase.from("notifications").insert({
        user_id: payout.user_id,
        title: `Withdrawal of ₹${payout.amount} rejected`,
        message: `Reason: ${reason}. The amount has been returned to your wallet.`,
        type: "payout",
      });
      try {
        if (prof?.email) {
          const { emailTpl, sendEmail } = await import("../_shared/emails.ts");
          await sendEmail(supabase, prof.email,
            emailTpl.payoutRejected(prof.full_name, Number(payout.amount), reason));
        }
      } catch (e) { console.error("payout email failed", e); }

      return json({ success: true, status: "rejected" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-payout-action error:", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});

async function audit(
  supabase: any, adminId: string, action: string, targetId: string, details: Record<string, unknown>,
) {
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: "payout_request",
    target_id: targetId,
    details,
  });
  if (error) console.error("admin_audit_log insert failed:", error);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
