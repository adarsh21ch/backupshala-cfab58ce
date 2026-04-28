/**
 * Backupshala — final commission model (mirrors verify-razorpay-payment).
 *
 * Platform course (is_platform_course = true):
 *   - Net = price − GST − gateway
 *   - WITH referral: platform 25% + affiliate 75%
 *   - NO referral: platform keeps 100% of net
 *
 * Creator course (is_platform_course = false):
 *   - Net = price − GST − gateway
 *   - Creator ALWAYS gets 15% of net
 *   - WITH referral: + affiliate 75%
 *   - NO referral: creator gets 15% + 75% = 90% of net
 *   - Self-referral by creator: split into 15% creator-fee + 75% affiliate (same total)
 */

export interface CommissionInputs {
  price: number;
  isPlatformCourse: boolean;
  // Settings (all percent values, 0–100)
  gstRatePct?: number;
  gatewayFeePct?: number;
  platformCoursePlatformPct?: number; // default 25
  platformCourseAffiliatePct?: number; // default 75
  creatorCoursePlatformPct?: number; // default 10
  creatorCourseCreatorPct?: number; // default 15
  creatorCourseAffiliatePct?: number; // default 75
}

export interface CommissionBreakdown {
  gross: number;
  gst: number;
  base: number;
  gatewayFee: number;
  net: number;
  // Base splits (before referral logic)
  platformBase: number;
  creatorBase: number;
  affiliateBase: number;
  // Final amounts in each scenario
  withReferral: { platform: number; creator: number; affiliate: number };
  withoutReferral: { platform: number; creator: number; affiliate: number };
  // Convenience
  affiliateEarning: number; // = affiliateBase, what referrer gets
  creatorEarningWithoutReferral: number;
  creatorEarningWithReferral: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const computeCommission = (inp: CommissionInputs): CommissionBreakdown => {
  const gstRate = (inp.gstRatePct ?? 18) / 100;
  const gwRate = (inp.gatewayFeePct ?? 2) / 100;

  const platformPct = inp.isPlatformCourse
    ? (inp.platformCoursePlatformPct ?? 25) / 100
    : (inp.creatorCoursePlatformPct ?? 10) / 100;
  const creatorPct = inp.isPlatformCourse
    ? 0
    : (inp.creatorCourseCreatorPct ?? 15) / 100;
  const affiliatePct = inp.isPlatformCourse
    ? (inp.platformCourseAffiliatePct ?? 75) / 100
    : (inp.creatorCourseAffiliatePct ?? 75) / 100;

  const gross = Math.max(0, inp.price);
  const base = r2(gross / (1 + gstRate));
  const gst = r2(gross - base);
  const gatewayFee = r2(base * gwRate);
  const net = r2(base - gatewayFee);

  const platformBase = r2(net * platformPct);
  const creatorBase = r2(net * creatorPct);
  const affiliateBase = r2(net * affiliatePct);

  let withReferral: { platform: number; creator: number; affiliate: number };
  let withoutReferral: { platform: number; creator: number; affiliate: number };

  if (inp.isPlatformCourse) {
    withReferral = { platform: platformBase, creator: 0, affiliate: affiliateBase };
    withoutReferral = { platform: net, creator: 0, affiliate: 0 };
  } else {
    withReferral = { platform: platformBase, creator: creatorBase, affiliate: affiliateBase };
    withoutReferral = { platform: platformBase, creator: r2(creatorBase + affiliateBase), affiliate: 0 };
  }

  return {
    gross, gst, base, gatewayFee, net,
    platformBase, creatorBase, affiliateBase,
    withReferral, withoutReferral,
    affiliateEarning: affiliateBase,
    creatorEarningWithoutReferral: withoutReferral.creator,
    creatorEarningWithReferral: withReferral.creator,
  };
};

/** Build inputs from platform_settings raw map. */
export const inputsFromSettings = (
  price: number,
  isPlatformCourse: boolean,
  raw: Record<string, string> = {},
): CommissionInputs => ({
  price,
  isPlatformCourse,
  gstRatePct: Number(raw.gst_rate_percent ?? 18),
  gatewayFeePct: Number(raw.gateway_fee_percent ?? 2),
  platformCoursePlatformPct: Number(raw.platform_course_platform_fee_percent ?? 25),
  platformCourseAffiliatePct: Number(raw.platform_course_affiliate_percent ?? 75),
  creatorCoursePlatformPct: Number(raw.creator_course_platform_fee_percent ?? 10),
  creatorCourseCreatorPct: Number(raw.creator_course_creator_fee_percent ?? 15),
  creatorCourseAffiliatePct: Number(raw.creator_course_affiliate_percent ?? 75),
});
