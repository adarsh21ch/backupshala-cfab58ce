import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

async function getSettingValue(supabase: any, key: string, defaultVal: string): Promise<string> {
  const { data } = await supabase.from("platform_settings").select("value").eq("key", key).maybeSingle();
  return data?.value || defaultVal;
}

async function ensureWallet(supabase: any, userId: string) {
  const { data } = await supabase.from("wallets").select("id, balance, total_earned").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: newWallet } = await supabase.from("wallets").insert({ user_id: userId }).select("id, balance, total_earned").single();
  return newWallet;
}

async function creditWallet(supabase: any, userId: string, amount: number, source: string, description: string, referenceId: string, holdDays: number) {
  const wallet = await ensureWallet(supabase, userId);
  if (!wallet) return;

  const availableAfter = holdDays > 0 ? new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000).toISOString() : null;

  await supabase.from("wallets").update({
    balance: Number(wallet.balance) + amount,
    total_earned: Number(wallet.total_earned) + amount,
  }).eq("id", wallet.id);

  await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    user_id: userId,
    type: "credit",
    amount,
    source,
    reference_id: referenceId,
    description,
    status: "completed",
    available_after: availableAfter,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, course_id } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !course_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC SHA256 signature
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const key = new TextEncoder().encode(RAZORPAY_KEY_SECRET);
    const msg = new TextEncoder().encode(body);
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msg);
    const expectedSignature = encodeHex(new Uint8Array(signature));

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment record
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("student_id", user.id)
      .single();

    if (payError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "success") {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate invoice number
    const invoice_number = "INV-" + new Date().getFullYear() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();

    // ====== SERVER-SIDE FEE CALCULATION (CANONICAL) ======
    // Rule: Creator ALWAYS gets creator_share% of net (after gateway).
    // Platform keeps the rest. Referral commission comes ONLY out of platform fee,
    // never out of the creator's share. Capped at platform fee amount.
    const coursePrice = Number(payment.amount_total);

    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("is_creator_pro")
      .eq("id", payment.creator_id)
      .single();

    const isCreatorPro = creatorProfile?.is_creator_pro === true;
    const freeFeePct = Number(await getSettingValue(supabase, "platform_fee_free", "10"));
    const proFeePct = Number(await getSettingValue(supabase, "platform_fee_pro", "10"));
    const platformFeePct = isCreatorPro ? proFeePct : freeFeePct;
    const creatorSharePct = 100 - platformFeePct; // creator always gets this %

    // GST handling (toggle-driven from settings)
    const gstEnabled = (await getSettingValue(supabase, "gst_enabled", "false")) === "true";
    const gstRate = Number(await getSettingValue(supabase, "gst_rate_percent", "18"));
    const baseAmount = gstEnabled
      ? Math.round((coursePrice / (1 + gstRate / 100)) * 100) / 100
      : coursePrice;
    const gstAmount = gstEnabled ? Math.round((coursePrice - baseAmount) * 100) / 100 : 0;

    // Gateway fee comes off the base (the working amount we split)
    const gatewayFeePct = Number(await getSettingValue(supabase, "gateway_fee_percent", "2"));
    const gatewayFeeAmount = Math.round((baseAmount * gatewayFeePct) / 100 * 100) / 100;
    const netAmount = Math.round((baseAmount - gatewayFeeAmount) * 100) / 100;

    // Creator gets fixed share of net. Platform keeps the rest.
    const creatorEarningAmount = Math.round(netAmount * (creatorSharePct / 100) * 100) / 100;
    const platformFeeAmount = Math.round((netAmount - creatorEarningAmount) * 100) / 100;

    // Update payment with server-calculated fees
    await supabase
      .from("payments")
      .update({
        status: "success",
        razorpay_payment_id,
        invoice_number,
        paid_at: new Date().toISOString(),
        base_amount: baseAmount,
        gst_amount: gstAmount,
        platform_fee_amount: platformFeeAmount,
        creator_payout_amount: creatorEarningAmount,
      })
      .eq("id", payment.id);

    // Get student profile
    const { data: student } = await supabase
      .from("profiles")
      .select("full_name, email, referrer_email")
      .eq("id", user.id)
      .single();

    // Get course info
    const { data: course } = await supabase
      .from("courses")
      .select("title, slug, creator_id")
      .eq("id", course_id)
      .single();

    // Create enrollment
    await supabase.from("enrollments").insert({
      student_id: user.id,
      course_id,
      referrer_email: student?.referrer_email || "none@backupshala.com",
      payment_id: payment.id,
      amount_paid: payment.amount_total,
    });

    // Update course total_students
    const { data: courseData } = await supabase
      .from("courses")
      .select("total_students")
      .eq("id", course_id)
      .single();
    await supabase
      .from("courses")
      .update({ total_students: (courseData?.total_students || 0) + 1 })
      .eq("id", course_id);

    // Get hold periods from settings
    const referralHoldDays = Number(await getSettingValue(supabase, "referral_hold_days", "7"));
    const creatorHoldDays = Number(await getSettingValue(supabase, "creator_hold_days", "3"));
    // referral_commission_percent is now: % OF PLATFORM FEE (not % of sale)
    const referralOfPlatformPct = Number(
      await getSettingValue(supabase, "referral_commission_percent", "70")
    );

    // Handle referral commission — comes ONLY from platform fee, never from creator
    if (student?.referrer_email && student.referrer_email !== "none@backupshala.com") {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", student.referrer_email)
        .neq("id", user.id)
        .maybeSingle();

      if (referrer) {
        // Take referral % of platform fee, capped at platform fee
        let commissionAmount = Math.round(platformFeeAmount * (referralOfPlatformPct / 100) * 100) / 100;
        if (commissionAmount > platformFeeAmount) commissionAmount = platformFeeAmount;
        if (commissionAmount < 0) commissionAmount = 0;

        if (commissionAmount > 0) {
          await supabase.from("commissions").insert({
            referrer_email: student.referrer_email,
            referrer_user_id: referrer.id,
            student_id: user.id,
            course_id,
            payment_id: payment.id,
            amount: commissionAmount,
            status: "credited",
            commission_type: "referral",
          });

          const holdDate = new Date(Date.now() + referralHoldDays * 24 * 60 * 60 * 1000);
          await creditWallet(
            supabase,
            referrer.id,
            commissionAmount,
            "referral_commission",
            `Commission for referring ${course?.title} to ${(student.full_name || "Someone").split(" ")[0]}`,
            payment.id,
            referralHoldDays
          );

          await supabase.from("notifications").insert({
            user_id: referrer.id,
            title: `You earned ₹${commissionAmount} commission! 💰`,
            message: `${(student.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. Available to withdraw on ${holdDate.toLocaleDateString("en-IN")}.`,
            type: "commission",
            action_url: "/refer",
          });
        }
      }
    }

    // Credit creator's wallet — ALWAYS the full creator share, never reduced by referral
    await creditWallet(
      supabase,
      payment.creator_id,
      creatorEarningAmount,
      "creator_earning",
      `Earning from sale of ${course?.title}`,
      payment.id,
      creatorHoldDays
    );

    const creatorHoldDate = new Date(Date.now() + creatorHoldDays * 24 * 60 * 60 * 1000);
    await supabase.from("creator_payouts").insert({
      creator_id: payment.creator_id,
      payment_id: payment.id,
      amount: creatorEarningAmount,
      status: "pending",
    });

    await supabase.from("notifications").insert({
      user_id: payment.creator_id,
      title: "New Sale! 🎉",
      message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. ₹${creatorEarningAmount} earned — available on ${creatorHoldDate.toLocaleDateString("en-IN")}.`,
      type: "enrollment",
      action_url: "/creator/earnings",
    });

    // Notification for student
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Enrollment Confirmed! 🎓",
      message: `You are now enrolled in ${course?.title}. Start learning now!`,
      type: "success",
      action_url: `/receipt/${payment.id}`,
    });

    // Update student total_enrolled
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("total_enrolled")
      .eq("id", user.id)
      .single();
    await supabase
      .from("profiles")
      .update({ total_enrolled: (studentProfile?.total_enrolled || 0) + 1 })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ success: true, invoice_number, payment_id: payment.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
