// Shared, atomic payout-request creation logic.
// Used by BOTH:
//   - create-payout-request  (manual, on-demand withdrawals)
//   - run-weekly-payouts     (automatic weekly run)
//
// This is the ONLY place that moves money for a payout request:
//   1. Block if the user already has an open (pending/approved/processing) request
//   2. Atomically deduct the wallet balance with a race guard
//   3. Insert the payout_requests row (tagged with `source`)
//   4. Insert the matching pending wallet_transactions debit (reference_id = payout id)
// On any failure after the deduction, the wallet balance is refunded.
//
// NOTE: callers are responsible for validating the destination details
// (UPI / bank / PAN) BEFORE calling this helper.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type PayoutMethod = "upi" | "bank";
export type PayoutRequestType =
  | "wallet_withdrawal"
  | "student_commission"
  | "creator_earnings";
export type PayoutSource = "manual" | "auto_weekly";

export interface CreatePayoutInput {
  userId: string;
  requestType: PayoutRequestType;
  amount: number;
  method: PayoutMethod;
  source: PayoutSource;
  // destination (already validated by caller)
  upi_id?: string;
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  pan_number?: string;
}

export interface CreatePayoutResult {
  ok: boolean;
  status: number;
  error?: string;
  payout_request_id?: string;
  new_balance?: number;
}

/**
 * Creates a payout request and atomically deducts the wallet balance.
 * Returns a structured result instead of throwing so batch callers can
 * collect per-user outcomes without aborting the whole run.
 */
export async function createPayout(
  supabase: SupabaseClient,
  input: CreatePayoutInput,
): Promise<CreatePayoutResult> {
  const amt = Number(input.amount);
  if (!Number.isFinite(amt) || amt < 500) {
    return { ok: false, status: 400, error: "Minimum payout is ₹500" };
  }
  if (amt > 1_00_00_000) {
    return { ok: false, status: 400, error: "Amount too large" };
  }

  // ---- Block if the user already has an open request ----
  const { data: existing } = await supabase
    .from("payout_requests")
    .select("id")
    .eq("user_id", input.userId)
    .in("status", ["pending", "approved", "processing"])
    .limit(1);
  if (existing && existing.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "You already have a pending payout request",
    };
  }

  // ---- WITHDRAWABLE balance gate (held money must be invisible) ----
  // Single source of truth: only credits whose hold has elapsed, minus all
  // debits/withdrawals already taken. Held (available_after > now) money can
  // NEVER be paid out, regardless of what wallets.balance shows.
  const { data: availRaw, error: availErr } = await supabase.rpc(
    "wallet_available_balance",
    { _user_id: input.userId },
  );
  if (availErr) return { ok: false, status: 500, error: availErr.message };
  const withdrawable = Number(availRaw) || 0;
  if (amt > withdrawable) {
    return {
      ok: false,
      status: 400,
      error: "Amount exceeds withdrawable balance — some funds are still on hold",
    };
  }

  // ---- Load wallet ----
  const { data: walletRow, error: walletSelErr } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (walletSelErr) return { ok: false, status: 500, error: walletSelErr.message };
  if (!walletRow) return { ok: false, status: 404, error: "Wallet not found" };

  const originalBalance = Number(walletRow.balance);
  const newBalance = originalBalance - amt;
  if (newBalance < 0) {
    return { ok: false, status: 400, error: "Insufficient wallet balance" };
  }

  // ---- Atomically deduct (race guard: only if balance still >= amt) ----
  const { data: updated, error: updErr } = await supabase
    .from("wallets")
    .update({ balance: newBalance })
    .eq("id", walletRow.id)
    .gte("balance", amt)
    .select("id, balance")
    .maybeSingle();
  if (updErr || !updated) {
    return { ok: false, status: 400, error: "Insufficient wallet balance" };
  }

  // ---- Build the payout_requests record ----
  const record: Record<string, unknown> = {
    user_id: input.userId,
    request_type: input.requestType,
    amount: amt,
    status: "pending",
    source: input.source,
  };
  if (input.method === "upi") {
    record.upi_id = input.upi_id;
  } else {
    record.bank_name = input.bank_name;
    record.account_holder_name = input.account_holder_name;
    record.account_number = input.account_number;
    record.ifsc_code = input.ifsc_code;
  }
  if (input.pan_number) record.pan_number = input.pan_number;

  const { data: payoutRow, error: insErr } = await supabase
    .from("payout_requests")
    .insert(record)
    .select("id")
    .maybeSingle();

  if (insErr || !payoutRow) {
    // Refund the wallet because the request couldn't be saved.
    await supabase
      .from("wallets")
      .update({ balance: originalBalance })
      .eq("id", walletRow.id);

    const dup = (insErr as { code?: string } | null)?.code === "23505";
    return {
      ok: false,
      status: dup ? 409 : 500,
      error: dup
        ? "You already have a pending payout request"
        : (insErr?.message || "Could not create payout request"),
    };
  }

  // ---- Matching pending debit transaction (linked to the payout request) ----
  const { error: txErr } = await supabase.from("wallet_transactions").insert({
    wallet_id: walletRow.id,
    user_id: input.userId,
    type: "debit",
    amount: amt,
    source: "withdrawal_requested",
    reference_id: payoutRow.id,
    description: `Withdrawal request via ${input.method.toUpperCase()}` +
      (input.source === "auto_weekly" ? " (auto weekly)" : ""),
    status: "pending",
  });
  if (txErr) {
    // Non-fatal — money is already deducted and the request exists. Log only.
    console.error("wallet_transactions insert failed:", txErr);
  }

  return {
    ok: true,
    status: 200,
    payout_request_id: payoutRow.id,
    new_balance: newBalance,
  };
}
