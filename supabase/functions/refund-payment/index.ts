// Admin-only refund flow:
// - Verifies caller has 'admin' role
// - Calls Razorpay Refund API
// - Marks payment as refunded
// - Marks enrollment as refunded (loses access)
// - Reverses creator/affiliate wallet credits + total_earned
// - Logs an audit entry
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { emailTpl, sendEmail } from "../_shared/emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side admin check (NEVER trust client claims)
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { payment_id, reason } = body as { payment_id?: string; reason?: string };
    if (!payment_id || typeof payment_id !== "string") {
      return new Response(JSON.stringify({ error: "payment_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const refundReason = (reason ?? "Refund issued by admin").toString().slice(0, 500);

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .maybeSingle();
    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.status !== "success" && payment.status !== "paid") {
      return new Response(JSON.stringify({ error: "Only successful payments can be refunded" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.refund_status === "processed") {
      return new Response(JSON.stringify({ error: "Already refunded" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!payment.razorpay_payment_id) {
      return new Response(JSON.stringify({ error: "No Razorpay payment id on record" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refundAmountPaise = Math.round(Number(payment.amount_total) * 100);

    // Call Razorpay refund API
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const auth = btoa(`${keyId}:${keySecret}`);
    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: refundAmountPaise,
          speed: "normal",
          notes: { reason: refundReason, admin_id: user.id },
        }),
      },
    );
    const rzpJson: any = await rzpRes.json().catch(() => ({}));
    if (!rzpRes.ok) {
      console.error("Razorpay refund failed:", rzpJson);
      return new Response(JSON.stringify({
        error: "Razorpay refund failed",
        detail: rzpJson?.error?.description || rzpJson,
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark payment as refunded
    await supabase.from("payments").update({
      refund_status: "processed",
      refund_amount: payment.amount_total,
      refund_reason: refundReason,
      refunded_at: new Date().toISOString(),
      razorpay_refund_id: rzpJson.id,
    }).eq("id", payment.id);

    // Mark enrollment refunded (loses access via RLS is_refunded checks)
    await supabase.from("enrollments").update({
      is_refunded: true,
      refunded_at: new Date().toISOString(),
    }).eq("payment_id", payment.id);

    // Cancel any pending creator payouts tied to this payment so admin doesn't pay them out
    await supabase.from("creator_payouts").update({
      status: "cancelled",
    }).eq("payment_id", payment.id).eq("status", "pending");

    // Mark referral commissions as reversed so they cannot be paid out
    await supabase.from("commissions").update({
      status: "reversed",
    }).eq("payment_id", payment.id);

    // TODO: certificates issued for this enrollment are NOT revoked here.
    // If the student already received a certificate, it remains valid until a separate
    // revocation flow is added (verify_certificate currently has no revoked flag).

    // Reverse wallet credits — creator + affiliate
    const reversals: Array<{ user_id: string; amount: number; source: string; description: string }> = [];
    if (payment.creator_id && Number(payment.creator_payout_amount) > 0) {
      reversals.push({
        user_id: payment.creator_id,
        amount: Number(payment.creator_payout_amount),
        source: "refund_reversal",
        description: `Refund reversal for payment ${payment.id}`,
      });
    }
    if (payment.affiliate_user_id && Number(payment.affiliate_commission_amount) > 0) {
      reversals.push({
        user_id: payment.affiliate_user_id,
        amount: Number(payment.affiliate_commission_amount),
        source: "refund_reversal",
        description: `Refund reversal for payment ${payment.id}`,
      });
    }

    for (const r of reversals) {
      const { data: wallet } = await supabase.from("wallets")
        .select("id, balance, total_earned")
        .eq("user_id", r.user_id).maybeSingle();
      if (!wallet) continue;
      const newBalance = Math.max(0, Number(wallet.balance) - r.amount);
      const newEarned = Math.max(0, Number(wallet.total_earned) - r.amount);
      await supabase.from("wallets").update({
        balance: newBalance, total_earned: newEarned,
      }).eq("id", wallet.id);

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: r.user_id,
        type: "debit",
        amount: r.amount,
        source: r.source,
        reference_id: payment.id,
        description: r.description,
        status: "completed",
      });
    }

    // Notify student
    await supabase.from("notifications").insert({
      user_id: payment.student_id,
      title: "Refund processed",
      message: `Your payment of ₹${Number(payment.amount_total).toFixed(2)} has been refunded. It will reflect in 5-7 business days.`,
      type: "info",
    });

    // Email student
    try {
      const { data: studentProf } = await supabase.from("profiles")
        .select("email, full_name").eq("id", payment.student_id).maybeSingle();
      const { data: courseRow } = await supabase.from("courses")
        .select("title").eq("id", payment.course_id).maybeSingle();
      if (studentProf?.email) {
        await sendEmail(supabase, studentProf.email,
          emailTpl.refundProcessed(studentProf.full_name, Number(payment.amount_total), courseRow?.title || "course", refundReason));
      }
    } catch (e) { console.error("refund email failed", e); }

    // Audit log (table may not exist on all envs — best-effort)
    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "refund_payment",
      target_type: "payment",
      target_id: payment.id,
      metadata: {
        razorpay_refund_id: rzpJson.id,
        amount: payment.amount_total,
        reason: refundReason,
      },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      success: true,
      refund_id: rzpJson.id,
      amount: payment.amount_total,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("refund-payment error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
