// Secure server-side payout request creation (manual / on-demand).
// - Verifies the JWT and identifies the user
// - Validates destination details
// - Delegates the money-moving (atomic wallet deduction + row inserts) to the
//   shared helper used by both this function and run-weekly-payouts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  createPayout,
  type PayoutMethod,
  type PayoutRequestType,
} from "../_shared/create-payout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  request_type: PayoutRequestType;
  amount: number;
  method: PayoutMethod;
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

    const allowedTypes: PayoutRequestType[] = [
      "wallet_withdrawal",
      "student_commission",
      "creator_earnings",
    ];
    if (!allowedTypes.includes(body.request_type)) {
      return json({ error: "Invalid request_type" }, 400);
    }

    const dest: {
      upi_id?: string;
      bank_name?: string;
      account_holder_name?: string;
      account_number?: string;
      ifsc_code?: string;
      pan_number?: string;
    } = {};

    if (body.method === "upi") {
      const upi = (body.upi_id || "").trim();
      if (!UPI_RE.test(upi)) return json({ error: "Invalid UPI ID" }, 400);
      dest.upi_id = upi;
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
      dest.bank_name = bank;
      dest.account_holder_name = holder;
      dest.account_number = acc;
      dest.ifsc_code = ifsc;
    } else {
      return json({ error: "Invalid payment method" }, 400);
    }

    // ---- PAN (required for student commissions) ----
    if (body.request_type === "student_commission") {
      const pan = (body.pan_number || "").trim().toUpperCase();
      if (!PAN_RE.test(pan)) return json({ error: "Valid PAN required" }, 400);
      dest.pan_number = pan;
      // Save PAN on profile (one-time KYC) — best effort
      await supabase.from("profiles")
        .update({ pan_number: pan })
        .eq("id", user.id)
        .is("pan_number", null);
    }

    const result = await createPayout(supabase, {
      userId: user.id,
      requestType: body.request_type,
      amount: amt,
      method: body.method,
      source: "manual",
      ...dest,
    });

    if (!result.ok) {
      return json({ error: result.error }, result.status);
    }

    return json({
      success: true,
      payout_request_id: result.payout_request_id,
      new_balance: result.new_balance,
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
