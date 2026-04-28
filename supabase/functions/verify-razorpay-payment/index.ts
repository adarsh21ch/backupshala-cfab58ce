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

    // ====== SERVER-SIDE COMMISSION CALCULATION (CANONICAL) ======
    // Platform course: platform 25% / affiliate 75% (or platform 100% if no referral)
    // Creator course: platform 10% / creator 15% / affiliate 75%
    //                 If no referral, the 75% affiliate share goes back to creator (=> creator 90%)
    const grossAmount = Number(payment.amount_total);

    const { data: courseRow } = await supabase
      .from("courses")
      .select("is_platform_course, creator_id, title")
      .eq("id", course_id)
      .single();
    const isPlatformCourse = courseRow?.is_platform_course === true;
    const courseCreatorId = courseRow?.creator_id ?? payment.creator_id;

    // Settings — pull all in one read for efficiency
    const { data: settingRows } = await supabase
      .from("platform_settings")
      .select("key, value");
    const settingsMap: Record<string, string> = {};
    (settingRows || []).forEach((r: any) => { settingsMap[r.key] = r.value; });
    const setting = (k: string, d: number) =>
      settingsMap[k] !== undefined ? Number(settingsMap[k]) : d;

    const gstRate = setting("gst_rate_percent", 18) / 100;
    const gatewayRate = setting("gateway_fee_percent", 2) / 100;

    // GST is always extracted (per new spec). Net = price − GST − gateway.
    const baseAmount = Math.round((grossAmount / (1 + gstRate)) * 100) / 100;
    const gstAmount = Math.round((grossAmount - baseAmount) * 100) / 100;
    const gatewayFeeAmount = Math.round(baseAmount * gatewayRate * 100) / 100;
    const netAmount = Math.round((baseAmount - gatewayFeeAmount) * 100) / 100;

    // Split percentages
    const platformPct = isPlatformCourse
      ? setting("platform_course_platform_fee_percent", 25) / 100
      : setting("creator_course_platform_fee_percent", 10) / 100;
    const creatorPct = isPlatformCourse
      ? 0
      : setting("creator_course_creator_fee_percent", 15) / 100;
    const affiliatePct = isPlatformCourse
      ? setting("platform_course_affiliate_percent", 75) / 100
      : setting("creator_course_affiliate_percent", 75) / 100;

    const baseSplit = (pct: number) => Math.round(netAmount * pct * 100) / 100;
    const platformBase = baseSplit(platformPct);
    const creatorBase = baseSplit(creatorPct);
    const affiliateBase = baseSplit(affiliatePct);

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

    // ───────────────────────────────────────────────────────────
    // REFERRAL COMMISSION — eligibility-gated (admin / creator / enrolled)
    // Resolves referrer from Razorpay order notes (set in create-order)
    // ───────────────────────────────────────────────────────────
    let resolvedReferrerId: string | null = null;
    try {
      const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`) },
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        const refId = orderData?.notes?.referrer_id;
        if (refId && typeof refId === "string" && refId.length > 10) resolvedReferrerId = refId;
      }
    } catch (e) { console.warn("Failed to fetch order notes", e); }

    // Eligibility check: admin OR own course OR enrolled
    let referralEligible = false;
    if (resolvedReferrerId && resolvedReferrerId !== user.id) {
      const { data: adminRole } = await supabase.from("user_roles")
        .select("role").eq("user_id", resolvedReferrerId).eq("role", "admin").maybeSingle();
      if (adminRole) referralEligible = true;
      else if (course?.creator_id === resolvedReferrerId) referralEligible = true;
      else {
        const { data: refEnroll } = await supabase.from("enrollments")
          .select("id").eq("student_id", resolvedReferrerId).eq("course_id", course_id).maybeSingle();
        if (refEnroll) referralEligible = true;
      }
    }

    if (resolvedReferrerId && referralEligible) {
      const { data: courseRowFull } = await supabase
        .from("courses").select("is_platform_course").eq("id", course_id).maybeSingle();
      const isPlat = courseRowFull?.is_platform_course === true;
      const platformReferralPct = Number(await getSettingValue(supabase, "platform_course_referral_percent", "15"));

      let commissionAmount = isPlat
        ? Math.round(netAmount * (platformReferralPct / 100) * 100) / 100
        : Math.round(platformFeeAmount * (referralOfPlatformPct / 100) * 100) / 100;
      if (!isPlat && commissionAmount > platformFeeAmount) commissionAmount = platformFeeAmount;
      if (commissionAmount < 0) commissionAmount = 0;

      if (commissionAmount > 0) {
        const { data: refProfile } = await supabase
          .from("profiles").select("email, full_name").eq("id", resolvedReferrerId).maybeSingle();
        const holdDate = new Date(Date.now() + referralHoldDays * 24 * 60 * 60 * 1000);

        await supabase.from("commissions").insert({
          referrer_email: refProfile?.email || "unknown@backupshala.com",
          referrer_user_id: resolvedReferrerId,
          student_id: user.id,
          course_id,
          payment_id: payment.id,
          amount: commissionAmount,
          status: "credited",
          commission_type: isPlat ? "platform_course_referral" : "creator_course_referral",
          available_after: holdDate.toISOString(),
        });

        await creditWallet(
          supabase, resolvedReferrerId, commissionAmount, "referral_commission",
          `Commission for referring ${course?.title}`, payment.id, referralHoldDays
        );

        await supabase.from("notifications").insert({
          user_id: resolvedReferrerId,
          title: `You earned ₹${commissionAmount} commission! 💰`,
          message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. Available on ${holdDate.toLocaleDateString("en-IN")}.`,
          type: "commission",
          action_url: "/refer",
        });
      }
    } else if (resolvedReferrerId) {
      console.log(`Referral commission skipped: referrer ${resolvedReferrerId} not eligible for course ${course_id}`);
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
