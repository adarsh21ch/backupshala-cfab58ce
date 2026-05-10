// Shared idempotent post-payment processor.
// Both `verify-razorpay-payment` (browser callback) and `razorpay-webhook`
// (server-to-server) call this. The function is safe to invoke multiple times
// for the same payment — at most one caller will perform the side effects.
//
// Idempotency layers:
//  1. Atomic "claim": UPDATE payments SET status='success' WHERE status<>'success'.
//     Only the first caller gets a returned row; everyone else sees alreadyProcessed.
//  2. DB unique indexes back this up:
//       - enrollments(student_id, course_id)
//       - commissions(payment_id, referrer_user_id) WHERE referrer_user_id IS NOT NULL
//       - wallet_transactions(reference_id, source, user_id) WHERE reference_id IS NOT NULL
//       - creator_payouts(payment_id, creator_id)
//     Each insert below tolerates 23505 (unique violation) so re-runs are no-ops.

import { emailTpl, sendEmail } from "./emails.ts";

type ProcessArgs = {
  supabase: any;
  payment: any;            // existing payments row
  razorpayPaymentId: string;
  razorpayOrderId: string;
};

type ProcessResult = {
  alreadyProcessed: boolean;
  invoiceNumber?: string;
  paymentId: string;
};

const isDup = (err: any) => err && (err.code === "23505" || /duplicate key/i.test(err.message || ""));

async function ensureWallet(supabase: any, userId: string) {
  const { data } = await supabase.from("wallets").select("id, balance, total_earned").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: nw } = await supabase.from("wallets").insert({ user_id: userId }).select("id, balance, total_earned").single();
  return nw;
}

// Idempotent wallet credit.
// Inserts the wallet_transactions row first (protected by UNIQUE(reference_id, source, user_id)).
// Only on a successful insert do we bump wallets.balance — so duplicate webhook + verify
// cannot double-credit the same payment.
async function creditWalletIdempotent(
  supabase: any,
  userId: string,
  amount: number,
  source: string,
  description: string,
  referenceId: string,
  holdDays: number,
) {
  const wallet = await ensureWallet(supabase, userId);
  if (!wallet) return false;
  const availableAfter = holdDays > 0 ? new Date(Date.now() + holdDays * 86400000).toISOString() : null;

  const { error } = await supabase.from("wallet_transactions").insert({
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
  if (error) {
    if (isDup(error)) return false;
    console.error("wallet_transactions insert failed", error);
    return false;
  }
  await supabase.from("wallets").update({
    balance: Number(wallet.balance) + amount,
    total_earned: Number(wallet.total_earned) + amount,
  }).eq("id", wallet.id);
  return true;
}

export async function processPaymentSuccess({ supabase, payment, razorpayPaymentId, razorpayOrderId }: ProcessArgs): Promise<ProcessResult> {
  const courseId = payment.course_id;
  const studentId = payment.student_id;

  // 1. Course + settings
  const { data: courseRow } = await supabase
    .from("courses")
    .select("is_platform_course, creator_id, title, course_level")
    .eq("id", courseId)
    .single();
  const isPlatformCourse = courseRow?.is_platform_course === true;
  const courseCreatorId = courseRow?.creator_id ?? payment.creator_id;

  const { data: settingRows } = await supabase.from("platform_settings").select("key, value");
  const sm: Record<string, string> = {};
  (settingRows || []).forEach((r: any) => { sm[r.key] = r.value; });
  const setting = (k: string, d: number) => sm[k] !== undefined ? Number(sm[k]) : d;

  const grossAmount = Number(payment.amount_total);
  const gstRate = setting("gst_rate_percent", 18) / 100;
  const gatewayRate = setting("gateway_fee_percent", 2) / 100;
  const baseAmount = Math.round((grossAmount / (1 + gstRate)) * 100) / 100;
  const gstAmount = Math.round((grossAmount - baseAmount) * 100) / 100;
  const gatewayFeeAmount = Math.round(baseAmount * gatewayRate * 100) / 100;
  const netAmount = Math.round((baseAmount - gatewayFeeAmount) * 100) / 100;

  const platformPct = isPlatformCourse
    ? setting("platform_course_platform_fee_percent", 25) / 100
    : setting("creator_course_platform_fee_percent", 10) / 100;
  const creatorPct = isPlatformCourse ? 0 : setting("creator_course_creator_fee_percent", 15) / 100;
  const affiliatePct = setting(isPlatformCourse ? "platform_course_affiliate_percent" : "creator_course_affiliate_percent", 75) / 100;
  const baseSplit = (p: number) => Math.round(netAmount * p * 100) / 100;
  const platformBase = baseSplit(platformPct);
  const creatorBase = baseSplit(creatorPct);
  const affiliateBase = baseSplit(affiliatePct);

  const referralHoldDays = setting("referral_hold_days", 7);
  const creatorHoldDays = setting("creator_hold_days", 3);
  const referralHoldDate = new Date(Date.now() + referralHoldDays * 86400000);
  const creatorHoldDate = new Date(Date.now() + creatorHoldDays * 86400000);

  // 2. Resolve referrer (from Razorpay order notes)
  let resolvedReferrerId: string | null = null;
  try {
    const RZP_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const r = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
      headers: { Authorization: "Basic " + btoa(`${RZP_KEY_ID}:${RZP_SECRET}`) },
    });
    if (r.ok) {
      const od = await r.json();
      const refId = od?.notes?.referrer_id;
      if (refId && typeof refId === "string" && refId.length > 10) resolvedReferrerId = refId;
    }
  } catch (e) { console.warn("order notes fetch failed", e); }
  if (resolvedReferrerId === studentId) resolvedReferrerId = null;

  let referralEligible = false;
  if (resolvedReferrerId) {
    const { data: adminRole } = await supabase.from("user_roles")
      .select("role").eq("user_id", resolvedReferrerId).eq("role", "admin").maybeSingle();
    if (adminRole) referralEligible = true;
    else if (courseCreatorId === resolvedReferrerId) referralEligible = true;
    else {
      const { data: refEnroll } = await supabase.from("enrollments")
        .select("id").eq("student_id", resolvedReferrerId).eq("course_id", courseId).maybeSingle();
      if (refEnroll) referralEligible = true;
    }
  }

  // BUSINESS RULE: A creator promoting their own course must NOT receive an
  // affiliate/referral commission payout — they already earn their normal
  // creator share on every valid sale. We still record the self-referral as a
  // zero-amount `commissions` row (status='self_sale_no_payout',
  // commission_type='self_referral') purely for analytics / dashboards.
  // Examples:
  //  - Creator A owns Course A. User B refers → B gets affiliate commission, A gets creator share.
  //  - Creator A owns Course A. A refers their own course → A gets ONLY creator share
  //    (creatorBase + affiliateBase rolls back into the creator), no affiliate payout.
  //  - User C (not creator) refers Course A → C gets affiliate commission, A gets creator share.
  const isOwnCourseReferral =
    !!resolvedReferrerId && referralEligible && resolvedReferrerId === courseCreatorId;

  // After detecting self-referral, suppress the affiliate side entirely so
  // splits and wallet credits behave exactly like "no referrer" sale.
  const payoutReferrerId = isOwnCourseReferral ? null : resolvedReferrerId;
  const payoutReferralEligible = referralEligible && !isOwnCourseReferral;

  let finalPlatformAmount = platformBase;
  let finalCreatorAmount = 0;
  let finalAffiliateAmount = 0;
  let affiliateUserId: string | null = null;
  if (isPlatformCourse) {
    if (payoutReferrerId && payoutReferralEligible) {
      finalAffiliateAmount = affiliateBase;
      affiliateUserId = payoutReferrerId;
    } else {
      // No payable affiliate (incl. self-referral) — platform absorbs the affiliate slice.
      finalPlatformAmount = netAmount;
    }
  } else {
    finalCreatorAmount = creatorBase;
    if (payoutReferrerId && payoutReferralEligible) {
      finalAffiliateAmount = affiliateBase;
      affiliateUserId = payoutReferrerId;
    } else {
      // No payable affiliate (incl. self-referral) — creator gets the affiliate slice
      // as part of their normal creator earning. NO separate affiliate wallet credit.
      finalCreatorAmount = creatorBase + affiliateBase;
    }
  }

  // 3. Generate invoice number
  let invoiceNumber: string;
  try {
    const { data: invNum, error: invErr } = await supabase.rpc("next_invoice_number");
    if (invErr || !invNum) throw invErr || new Error("no invoice number");
    invoiceNumber = invNum as string;
  } catch (e) {
    console.error("next_invoice_number failed, fallback:", (e as Error)?.message);
    invoiceNumber = "BKS-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
  }

  // 4. ATOMIC CLAIM. Only the first concurrent caller (verify OR webhook) gets a row back.
  const { data: claimed, error: claimErr } = await supabase
    .from("payments")
    .update({
      status: "success",
      razorpay_payment_id: razorpayPaymentId,
      invoice_number: invoiceNumber,
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
    .eq("id", payment.id)
    .neq("status", "success")
    .select("id, invoice_number");

  if (claimErr) {
    console.error("payment claim failed", claimErr);
    throw claimErr;
  }
  if (!claimed || claimed.length === 0) {
    // Another caller already finalized this payment.
    const { data: existing } = await supabase
      .from("payments").select("invoice_number").eq("id", payment.id).maybeSingle();
    return { alreadyProcessed: true, invoiceNumber: existing?.invoice_number, paymentId: payment.id };
  }

  // 4b. Coupon usage — atomic increment, only the claiming caller reaches this.
  // Re-checks max_uses with a conditional update so concurrent orders cannot
  // push uses_count past max_uses.
  if (payment.coupon_id) {
    try {
      const { data: c } = await supabase
        .from("coupon_codes")
        .select("id, uses_count, max_uses")
        .eq("id", payment.coupon_id)
        .maybeSingle();
      if (c) {
        const next = Number(c.uses_count || 0) + 1;
        let q = supabase.from("coupon_codes")
          .update({ uses_count: next })
          .eq("id", c.id)
          .eq("uses_count", c.uses_count); // optimistic lock
        if (c.max_uses != null) q = q.lt("uses_count", c.max_uses);
        const { error: incErr } = await q;
        if (incErr) console.error("coupon uses_count increment failed", incErr);
      }
    } catch (e) {
      console.error("coupon increment error", e);
    }
  }
  // TODO: per-user redemption limits require a `coupon_redemptions(coupon_id, user_id)`
  // table with a UNIQUE(coupon_id, user_id) index. Schema doesn't have one yet, so
  // a coupon can currently be re-used by the same student across multiple courses.
  const { data: student } = await supabase
    .from("profiles").select("full_name, email, referrer_email").eq("id", studentId).single();

  // 5. Enrollment (idempotent via UNIQUE student_id+course_id)
  const { error: enrErr } = await supabase.from("enrollments").insert({
    student_id: studentId,
    course_id: courseId,
    referrer_email: student?.referrer_email || "none@backupshala.com",
    payment_id: payment.id,
    amount_paid: payment.amount_total,
  });
  let mainEnrollmentInserted = !enrErr;
  if (enrErr && !isDup(enrErr)) console.error("enrollment insert failed", enrErr);

  // 6. Tier auto-grants
  try {
    const tiersToGrant: string[] = [];
    if (courseRow?.course_level === "advanced") tiersToGrant.push("basic");
    if (courseRow?.course_level === "premium") tiersToGrant.push("basic", "advanced");
    if (tiersToGrant.length) {
      const keys = tiersToGrant.map((t) => `${t}_course_id`);
      const { data: srows } = await supabase.from("platform_settings").select("key, value").in("key", keys);
      for (const row of srows ?? []) {
        const targetCourseId = row.value;
        const tierName = row.key.replace("_course_id", "");
        if (!targetCourseId || targetCourseId === courseId) continue;
        const { error: gErr } = await supabase.from("enrollments").insert({
          student_id: studentId,
          course_id: targetCourseId,
          referrer_email: student?.referrer_email || "none@backupshala.com",
          payment_id: payment.id,
          amount_paid: 0,
          tier: tierName,
          grant_reason: `Included with ${courseRow?.course_level} purchase`,
        });
        if (!gErr) {
          const { data: bc } = await supabase.from("courses").select("total_students").eq("id", targetCourseId).single();
          await supabase.from("courses").update({ total_students: (bc?.total_students || 0) + 1 }).eq("id", targetCourseId);
        } else if (!isDup(gErr)) {
          console.error("tier-grant insert failed", gErr);
        }
      }
    }
  } catch (e) { console.error("tier auto-grant failed", e); }

  // 7. Bump course total_students only if the main enrollment was actually inserted now.
  if (mainEnrollmentInserted) {
    const { data: cd } = await supabase.from("courses").select("total_students").eq("id", courseId).single();
    await supabase.from("courses").update({ total_students: (cd?.total_students || 0) + 1 }).eq("id", courseId);
  }

  const courseType = isPlatformCourse ? "platform" : "creator";

  // 8. Creator earnings
  if (!isPlatformCourse && finalCreatorAmount > 0 && courseCreatorId) {
    const creatorAmt = isOwnCourseReferral ? creatorBase : finalCreatorAmount;
    await creditWalletIdempotent(
      supabase, courseCreatorId, creatorAmt,
      "creator_earning",
      `Earnings from sale of ${courseRow?.title}`,
      payment.id, creatorHoldDays,
    );

    const { error: cpErr } = await supabase.from("creator_payouts").insert({
      creator_id: courseCreatorId,
      payment_id: payment.id,
      amount: finalCreatorAmount,
      status: "pending",
    });
    if (cpErr && !isDup(cpErr)) console.error("creator_payouts insert failed", cpErr);

    if (mainEnrollmentInserted) {
      await supabase.from("notifications").insert({
        user_id: courseCreatorId,
        title: "New Sale! 🎉",
        message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${courseRow?.title}. ₹${finalCreatorAmount.toFixed(0)} earned — available on ${creatorHoldDate.toLocaleDateString("en-IN")}.`,
        type: "enrollment",
        action_url: "/creator/earnings",
      });
    }
  }

  // 9. Affiliate commission
  if (finalAffiliateAmount > 0 && affiliateUserId) {
    const { data: refProfile } = await supabase
      .from("profiles").select("email, full_name").eq("id", affiliateUserId).maybeSingle();

    const { error: comErr } = await supabase.from("commissions").insert({
      referrer_email: refProfile?.email || "unknown@backupshala.com",
      referrer_user_id: affiliateUserId,
      student_id: studentId,
      course_id: courseId,
      payment_id: payment.id,
      amount: finalAffiliateAmount,
      status: "credited",
      commission_type: isOwnCourseReferral
        ? "self_referral"
        : (isPlatformCourse ? "platform_course_referral" : "creator_course_referral"),
      course_type: courseType,
      available_after: referralHoldDate.toISOString(),
    });
    const commissionInserted = !comErr;
    if (comErr && !isDup(comErr)) console.error("commission insert failed", comErr);

    if (commissionInserted) {
      await creditWalletIdempotent(
        supabase, affiliateUserId, finalAffiliateAmount,
        isOwnCourseReferral ? "affiliate_commission" : "referral_commission",
        isOwnCourseReferral
          ? `Affiliate commission (own course) for ${courseRow?.title}`
          : `Commission for referring ${courseRow?.title}`,
        payment.id, referralHoldDays,
      );
      await supabase.from("notifications").insert({
        user_id: affiliateUserId,
        title: `You earned ₹${finalAffiliateAmount.toFixed(0)} commission! 💰`,
        message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${courseRow?.title}. Available on ${referralHoldDate.toLocaleDateString("en-IN")}.`,
        type: "commission",
        action_url: "/refer",
      });
    }
  }

  // 10. Student notification + emails — only on first finalize
  if (mainEnrollmentInserted) {
    await supabase.from("notifications").insert({
      user_id: studentId,
      title: "Enrollment Confirmed! 🎓",
      message: `You are now enrolled in ${courseRow?.title}. Start learning now!`,
      type: "success",
      action_url: `/receipt/${payment.id}`,
    });

    try {
      if (student?.email) {
        await sendEmail(supabase, student.email,
          emailTpl.enrollmentConfirmed(student.full_name, courseRow?.title || "your course"));
      }
      if (finalAffiliateAmount > 0 && affiliateUserId) {
        const { data: rp } = await supabase.from("profiles").select("email, full_name").eq("id", affiliateUserId).maybeSingle();
        if (rp?.email) {
          await sendEmail(supabase, rp.email,
            emailTpl.commissionEarned(rp.full_name, finalAffiliateAmount, courseRow?.title || "a course"));
        }
      }
    } catch (e) { console.error("emails failed", e); }

    const { data: sp } = await supabase.from("profiles").select("total_enrolled").eq("id", studentId).single();
    await supabase.from("profiles").update({ total_enrolled: (sp?.total_enrolled || 0) + 1 }).eq("id", studentId);
  }

  return { alreadyProcessed: false, invoiceNumber, paymentId: payment.id };
}
