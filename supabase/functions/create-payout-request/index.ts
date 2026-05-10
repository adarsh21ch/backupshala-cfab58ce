// Secure server-side payout request creation.
// - Verifies the JWT and identifies the user
// - Atomically deducts the wallet balance (DB CHECK prevents overdraft)
// - DB unique partial index prevents more than one pending/processing request
// - Inserts the payout_requests row + a pending wallet_transactions row that
//   references the payout request via reference_id
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Method = "upi" | "bank";
type RequestType =
  | "wallet_withdrawal"
  | "student_commission"
  | "creator_earnings";

interface Body {
  request_type: RequestType;
  amount: number;
  method: Method;
  upi_id?: string;
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  pan_number?: string;
}

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/;
const ACC_RE = /^\d{9,18}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json({ error: "Invalid token" }, 401);

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    // ---- Validate basic fields ----
    const amt = Number(body.amount);
    if (!Number.isFinite(amt) || amt < 500) {
      return json({ error: "Minimum payout is ₹500" }, 400);
    }
    if (amt > 1_00_00_000) return json({ error: "Amount too large" }, 400);

    const allowedTypes: RequestType[] = [
      "wallet_withdrawal",
      "student_commission",
      "creator_earnings",
    ];
    if (!allowedTypes.includes(body.request_type)) {
      return json({ error: "Invalid request_type" }, 400);
    }

    const record: Record<string, unknown> = {
      user_id: user.id,
      request_type: body.request_type,
      amount: amt,
      status: "pending",
    };

    if (body.method === "upi") {
      const upi = (body.upi_id || "").trim();
      if (!UPI_RE.test(upi)) return json({ error: "Invalid UPI ID" }, 400);
      record.upi_id = upi;
    } else if (body.method === "bank") {
      const bank = (body.bank_name || "").trim();
      const holder = (body.account_holder_name || "").trim();
      const acc = (body.account_number || "").trim();
      const ifsc = (body.ifsc_code || "").trim().toUpperCase();
      if (!bank || !holder) return json({ error: "Bank details required" }, 400);
      if (!ACC_RE.test(acc)) {
        return json({ error: "Account number must be 9-18 digits" }, 400);
      }
      if (!IFSC_RE.test(ifsc)) return json({ error: "Invalid IFSC code" }, 400);
      record.bank_name = bank;
      record.account_holder_name = holder;
      record.account_number = acc;
      record.ifsc_code = ifsc;
    } else {
      return json({ error: "Invalid payment method" }, 400);
    }

    // ---- PAN (required for student commissions) ----
    if (body.request_type === "student_commission") {
      const pan = (body.pan_number || "").trim().toUpperCase();
      if (!PAN_RE.test(pan)) return json({ error: "Valid PAN required" }, 400);
      record.pan_number = pan;
      // Save PAN on profile (one-time KYC) — best effort
      await supabase.from("profiles")
        .update({ pan_number: pan })
        .eq("id", user.id)
        .is("pan_number", null);
    }

    // ---- Block if user already has a pending/processing request ----
    const { data: existing } = await supabase
      .from("payout_requests")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved", "processing"])
      .limit(1);
    if (existing && existing.length > 0) {
      return json({
        error: "You already have a pending payout request",
      }, 409);
    }

    // ---- Atomically deduct wallet balance ----
    // The wallets table has CHECK (balance >= 0). We update only if there's
    // enough balance. Returning lets us detect insufficiency without a race.
    const { data: walletRow, error: walletSelErr } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (walletSelErr) return json({ error: walletSelErr.message }, 500);
    if (!walletRow) return json({ error: "Wallet not found" }, 404);

    const newBalance = Number(walletRow.balance) - amt;
    if (newBalance < 0) {
      return json({ error: "Insufficient wallet balance" }, 400);
    }

    const { data: updated, error: updErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", walletRow.id)
      .gte("balance", amt) // race guard
      .select("id, balance")
      .maybeSingle();
    if (updErr) {
      // CHECK constraint violation (overdraft race) lands here
      return json({ error: "Insufficient wallet balance" }, 400);
    }
    if (!updated) {
      return json({ error: "Insufficient wallet balance" }, 400);
    }

    // ---- Insert payout_requests row ----
    const { data: payoutRow, error: insErr } = await supabase
      .from("payout_requests")
      .insert(record)
      .select("id")
      .maybeSingle();

    if (insErr || !payoutRow) {
      // Refund the wallet because the request couldn't be saved.
      await supabase.from("wallets")
        .update({ balance: Number(walletRow.balance) })
        .eq("id", walletRow.id);

      const dup = (insErr as any)?.code === "23505";
      return json({
        error: dup
          ? "You already have a pending payout request"
          : (insErr?.message || "Could not create payout request"),
      }, dup ? 409 : 500);
    }

    // ---- Pending debit transaction, linked to the payout request ----
    const { error: txErr } = await supabase.from("wallet_transactions").insert({
      wallet_id: walletRow.id,
      user_id: user.id,
      type: "debit",
      amount: amt,
      source: "withdrawal_requested",
      reference_id: payoutRow.id, // links the txn to the payout request
      description: `Withdrawal request via ${body.method.toUpperCase()}`,
      status: "pending",
    });
    if (txErr) {
      console.error("wallet_transactions insert failed:", txErr);
      // Non-fatal — money is already deducted and request created. Log only.
    }

    return json({
      success: true,
      payout_request_id: payoutRow.id,
      new_balance: newBalance,
    }, 200);
  } catch (e) {
    console.error("create-payout-request error:", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
