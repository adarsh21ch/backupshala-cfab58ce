// Edge function: Verify Razorpay signature for an upgrade payment
// and apply the Basic→Advanced upgrade (update enrollment tier, record course_upgrades,
// credit creator wallet for the upgrade amount).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getSetting(supabase: any, key: string, fallback: string) {
  const { data } = await supabase.from("platform_settings").select("value").eq("key", key).maybeSingle();
  return data?.value || fallback;
}

async function ensureWallet(supabase: any, userId: string) {
  const { data } = await supabase.from("wallets").select("id, balance, total_earned").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: newW } = await supabase.from("wallets").insert({ user_id: userId }).select("id, balance, total_earned").single();
  return newW;
}

async function creditWallet(supabase: any, userId: string, amount: number, source: string, description: string, refId: string, holdDays: number) {
  const wallet = await ensureWallet(supabase, userId);
  if (!wallet) return;
  const availableAfter = holdDays > 0 ? new Date(Date.now() + holdDays * 86400_000).toISOString() : null;
  await supabase.from("wallets").update({
    balance: Number(wallet.balance) + amount,
    total_earned: Number(wallet.total_earned) + amount,
  }).eq("id", wallet.id);
  await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id, user_id: userId, type: "credit", amount, source,
    reference_id: refId, description, status: "completed", available_after: availableAfter,
  });
}

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      console.error("Auth getUser failed:", userErr?.message);
      return new Response(JSON.stringify({ error: "Invalid token", detail: userErr?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, course_id } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !course_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature
    const SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const key = new TextEncoder().encode(SECRET);
    const msg = new TextEncoder().encode(body);
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
    const expected = encodeHex(new Uint8Array(sig));
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("student_id", user.id)
      .single();
    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.status === "success") {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify enrollment + not already upgraded
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, tier")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();
    if (!enrollment || enrollment.tier === "advanced") {
      return new Response(JSON.stringify({ error: "Invalid upgrade state" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify amount matches the upgrade price
    const basicPrice = Number(await getSetting(supabase, "basic_price", "249"));
    const advancedPrice = Number(await getSetting(supabase, "advanced_price", "499"));
    const upgradePrice = Math.max(0, advancedPrice - basicPrice);
    if (Number(payment.amount_total) !== upgradePrice) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute creator share for upgrade payment (same rules)
    const { data: creatorProfile } = await supabase
      .from("profiles").select("is_creator_pro").eq("id", payment.creator_id).single();
    const isPro = creatorProfile?.is_creator_pro === true;
    const platformFeePct = Number(await getSetting(supabase, isPro ? "platform_fee_pro" : "platform_fee_free", "10"));
    const gatewayFeePct = Number(await getSetting(supabase, "gateway_fee_percent", "2"));
    const creatorHoldDays = Number(await getSetting(supabase, "creator_hold_days", "3"));

    const gatewayFee = Math.round(upgradePrice * gatewayFeePct / 100 * 100) / 100;
    const netAmount = Math.round((upgradePrice - gatewayFee) * 100) / 100;
    const creatorShare = Math.round(netAmount * (100 - platformFeePct) / 100 * 100) / 100;
    const platformFee = Math.round((netAmount - creatorShare) * 100) / 100;

    const invoice_number = "UPG-" + new Date().getFullYear() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Mark payment success
    await supabase.from("payments").update({
      status: "success",
      razorpay_payment_id,
      invoice_number,
      paid_at: new Date().toISOString(),
      platform_fee_amount: platformFee,
      creator_payout_amount: creatorShare,
    }).eq("id", payment.id);

    // Update enrollment tier → advanced
    await supabase.from("enrollments").update({ tier: "advanced" }).eq("id", enrollment.id);

    // Record the upgrade
    await supabase.from("course_upgrades").insert({
      user_id: user.id,
      course_id,
      upgrade_payment_id: payment.id,
      amount_paid: upgradePrice,
      from_tier: "basic",
      to_tier: "advanced",
    });

    // Get course + student
    const { data: course } = await supabase.from("courses").select("title").eq("id", course_id).single();
    const { data: student } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

    // Credit creator wallet
    await creditWallet(
      supabase, payment.creator_id, creatorShare, "upgrade_earning",
      `Upgrade earning from ${course?.title}`, payment.id, creatorHoldDays,
    );

    await supabase.from("creator_payouts").insert({
      creator_id: payment.creator_id, payment_id: payment.id, amount: creatorShare, status: "pending",
    });

    // Notifications
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Advanced Access Unlocked! 🎉",
      message: `You now have full Advanced access to ${course?.title}.`,
      type: "success",
      action_url: `/courses/${course_id}`,
    });
    await supabase.from("notifications").insert({
      user_id: payment.creator_id,
      title: "Course Upgrade Sale! ⭐",
      message: `${(student?.full_name || "Someone").split(" ")[0]} upgraded to Advanced for ${course?.title}. ₹${creatorShare} earned.`,
      type: "enrollment",
      action_url: "/creator/earnings",
    });

    return new Response(
      JSON.stringify({ success: true, invoice_number }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
