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

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Auth getUser failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Invalid token", detail: userError?.message }), {
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

    // Generate sequential GST invoice number via DB sequence
    let invoice_number: string;
    try {
      const { data: invNum, error: invErr } = await supabase.rpc("next_invoice_number");
      if (invErr || !invNum) throw invErr || new Error("no invoice number");
      invoice_number = invNum as string;
    } catch (e) {
      console.error("next_invoice_number RPC failed, falling back:", (e as Error)?.message);
      invoice_number = "BKS-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
    }

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

    // Get course info (title used in messages)
    const course = courseRow;

    // Hold periods
    const referralHoldDays = setting("referral_hold_days", 7);
    const creatorHoldDays = setting("creator_hold_days", 3);
    const referralHoldDate = new Date(Date.now() + referralHoldDays * 24 * 60 * 60 * 1000);
    const creatorHoldDate = new Date(Date.now() + creatorHoldDays * 24 * 60 * 60 * 1000);

    // ───────────────────────────────────────────────────────────
    // RESOLVE REFERRER from Razorpay order notes (set in create-order)
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

    // Self-referral guard
    if (resolvedReferrerId === user.id) resolvedReferrerId = null;

    // Eligibility check: admin OR own course OR enrolled
    let referralEligible = false;
    if (resolvedReferrerId) {
      const { data: adminRole } = await supabase.from("user_roles")
        .select("role").eq("user_id", resolvedReferrerId).eq("role", "admin").maybeSingle();
      if (adminRole) referralEligible = true;
      else if (courseCreatorId === resolvedReferrerId) referralEligible = true;
      else {
        const { data: refEnroll } = await supabase.from("enrollments")
          .select("id").eq("student_id", resolvedReferrerId).eq("course_id", course_id).maybeSingle();
        if (refEnroll) referralEligible = true;
      }
    }

    const isOwnCourseReferral =
      !!resolvedReferrerId && referralEligible && resolvedReferrerId === courseCreatorId && !isPlatformCourse;

    // ───────────────────────────────────────────────────────────
    // FINAL AMOUNTS
    // ───────────────────────────────────────────────────────────
    let finalPlatformAmount = platformBase;
    let finalCreatorAmount = 0;
    let finalAffiliateAmount = 0;
    let affiliateUserId: string | null = null;

    if (isPlatformCourse) {
      if (resolvedReferrerId && referralEligible) {
        finalPlatformAmount = platformBase;
        finalAffiliateAmount = affiliateBase;
        affiliateUserId = resolvedReferrerId;
      } else {
        finalPlatformAmount = netAmount;
        finalAffiliateAmount = 0;
      }
    } else {
      finalPlatformAmount = platformBase;
      finalCreatorAmount = creatorBase;
      if (resolvedReferrerId && referralEligible) {
        finalAffiliateAmount = affiliateBase;
        affiliateUserId = resolvedReferrerId;
      } else {
        finalCreatorAmount = creatorBase + affiliateBase;
        finalAffiliateAmount = 0;
      }
    }

    // Persist payment breakdown
    await supabase
      .from("payments")
      .update({
        status: "success",
        razorpay_payment_id,
        invoice_number,
        paid_at: new Date().toISOString(),
        base_amount: baseAmount,
        gst_amount: gstAmount,
        gateway_fee_amount: gatewayFeeAmount,
        net_amount: netAmount,
        platform_fee_amount: finalPlatformAmount,
        creator_fee_amount: finalCreatorAmount,
        affiliate_commission_amount: finalAffiliateAmount,
        affiliate_user_id: affiliateUserId,
        is_platform_course: isPlatformCourse,
        creator_payout_amount: finalCreatorAmount,
      })
      .eq("id", payment.id);

    // Create enrollment
    await supabase.from("enrollments").insert({
      student_id: user.id,
      course_id,
      referrer_email: student?.referrer_email || "none@backupshala.com",
      payment_id: payment.id,
      amount_paid: payment.amount_total,
    });

    // ─────────────────────────────────────────────────────────
    // Phase 7: Tier auto-grants
    //   Advanced → Basic
    //   Premium  → Basic + Advanced
    // ─────────────────────────────────────────────────────────
    try {
      const { data: lvlRow } = await supabase
        .from("courses")
        .select("course_level")
        .eq("id", course_id)
        .maybeSingle();

      const tiersToGrant: string[] = [];
      if (lvlRow?.course_level === "advanced") tiersToGrant.push("basic");
      if (lvlRow?.course_level === "premium") tiersToGrant.push("basic", "advanced");

      if (tiersToGrant.length > 0) {
        const settingKeys = tiersToGrant.map((t) => `${t}_course_id`);
        const { data: settingRows } = await supabase
          .from("platform_settings")
          .select("key, value")
          .in("key", settingKeys);

        for (const row of settingRows ?? []) {
          const targetCourseId = row.value;
          const tierName = row.key.replace("_course_id", "");
          if (!targetCourseId || targetCourseId === course_id) continue;

          const { data: existing } = await supabase
            .from("enrollments")
            .select("id")
            .eq("student_id", user.id)
            .eq("course_id", targetCourseId)
            .maybeSingle();
          if (existing) continue;

          await supabase.from("enrollments").insert({
            student_id: user.id,
            course_id: targetCourseId,
            referrer_email: student?.referrer_email || "none@backupshala.com",
            payment_id: payment.id,
            amount_paid: 0,
            tier: tierName,
            grant_reason: `Included with ${lvlRow?.course_level} purchase`,
          });

          const { data: bc } = await supabase
            .from("courses")
            .select("total_students")
            .eq("id", targetCourseId)
            .single();
          await supabase
            .from("courses")
            .update({ total_students: (bc?.total_students || 0) + 1 })
            .eq("id", targetCourseId);
        }
      }
    } catch (e) {
      console.error("Tier auto-grant failed:", e);
    }


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

    // ───────────────────────────────────────────────────────────
    // CREDIT WALLETS
    // ───────────────────────────────────────────────────────────
    const courseType = isPlatformCourse ? "platform" : "creator";

    if (!isPlatformCourse && finalCreatorAmount > 0 && courseCreatorId) {
      if (isOwnCourseReferral) {
        await creditWallet(
          supabase, courseCreatorId, creatorBase,
          "creator_earning",
          `Creator fee from sale of ${course?.title}`,
          payment.id, creatorHoldDays,
        );
      } else {
        await creditWallet(
          supabase, courseCreatorId, finalCreatorAmount,
          "creator_earning",
          `Earnings from sale of ${course?.title}`,
          payment.id, creatorHoldDays,
        );
      }

      await supabase.from("creator_payouts").insert({
        creator_id: courseCreatorId,
        payment_id: payment.id,
        amount: finalCreatorAmount,
        status: "pending",
      });

      await supabase.from("notifications").insert({
        user_id: courseCreatorId,
        title: "New Sale! 🎉",
        message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. ₹${finalCreatorAmount.toFixed(0)} earned — available on ${creatorHoldDate.toLocaleDateString("en-IN")}.`,
        type: "enrollment",
        action_url: "/creator/earnings",
      });
    }

    if (finalAffiliateAmount > 0 && affiliateUserId) {
      const { data: refProfile } = await supabase
        .from("profiles").select("email, full_name").eq("id", affiliateUserId).maybeSingle();

      await supabase.from("commissions").insert({
        referrer_email: refProfile?.email || "unknown@backupshala.com",
        referrer_user_id: affiliateUserId,
        student_id: user.id,
        course_id,
        payment_id: payment.id,
        amount: finalAffiliateAmount,
        status: "credited",
        commission_type: isOwnCourseReferral
          ? "self_referral"
          : (isPlatformCourse ? "platform_course_referral" : "creator_course_referral"),
        course_type: courseType,
        available_after: referralHoldDate.toISOString(),
      });

      await creditWallet(
        supabase, affiliateUserId, finalAffiliateAmount,
        isOwnCourseReferral ? "affiliate_commission" : "referral_commission",
        isOwnCourseReferral
          ? `Affiliate commission (own course) for ${course?.title}`
          : `Commission for referring ${course?.title}`,
        payment.id, referralHoldDays,
      );

      await supabase.from("notifications").insert({
        user_id: affiliateUserId,
        title: `You earned ₹${finalAffiliateAmount.toFixed(0)} commission! 💰`,
        message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. Available on ${referralHoldDate.toLocaleDateString("en-IN")}.`,
        type: "commission",
        action_url: "/refer",
      });
    } else if (resolvedReferrerId && !referralEligible) {
      console.log(`Referral skipped: referrer ${resolvedReferrerId} not eligible for course ${course_id}`);
    }

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
