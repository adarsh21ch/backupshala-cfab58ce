/**
 * Centralized tier pricing helpers.
 * All prices and percentages come from platform_settings; never hardcode.
 */

export type CourseTier = 'basic' | 'advanced';

export interface TierPriceConfig {
  basicPrice: number;
  advancedPrice: number;
  upgradePrice: number; // advanced - basic
}

export interface CommissionConfig {
  platformFeePct: number; // e.g. 10 (free creator)
  platformFeeProPct: number; // e.g. 10 (pro creator)
  gatewayFeePct: number; // e.g. 2
  referralOfPlatformPct: number; // e.g. 70 (% of platform fee paid to referrer)
  gstEnabled: boolean;
  gstRatePct: number;
}

export const getTierPrices = (settings: Record<string, string>): TierPriceConfig => {
  const basicPrice = Number(settings.basic_price ?? '249');
  const advancedPrice = Number(settings.advanced_price ?? '499');
  const upgradePrice = Math.max(0, advancedPrice - basicPrice);
  return { basicPrice, advancedPrice, upgradePrice };
};

export const getCommissionConfig = (settings: Record<string, string>): CommissionConfig => ({
  platformFeePct: Number(settings.platform_fee_free ?? '10'),
  platformFeeProPct: Number(settings.platform_fee_pro ?? '10'),
  gatewayFeePct: Number(settings.gateway_fee_percent ?? '2'),
  referralOfPlatformPct: Number(settings.referral_commission_percent ?? '70'),
  gstEnabled: settings.gst_enabled === 'true',
  gstRatePct: Number(settings.gst_rate_percent ?? '18'),
});

/**
 * Calculate creator earnings on a single sale, mirroring server-side logic.
 * Creator ALWAYS gets (100 - platformFee)% of net. Referral comes from platform fee.
 */
export interface SaleSplit {
  customerPays: number;
  baseAmount: number;
  gstAmount: number;
  gatewayFee: number;
  netAmount: number;
  creatorShare: number;
  platformFee: number;
  referralCommission: number; // max possible if referred
  platformKeeps: number;
}

export const calculateSaleSplit = (
  price: number,
  cfg: CommissionConfig,
  isPro = false,
): SaleSplit => {
  const platformPct = isPro ? cfg.platformFeeProPct : cfg.platformFeePct;
  const baseAmount = cfg.gstEnabled ? price / (1 + cfg.gstRatePct / 100) : price;
  const gstAmount = cfg.gstEnabled ? price - baseAmount : 0;
  const gatewayFee = baseAmount * (cfg.gatewayFeePct / 100);
  const netAmount = baseAmount - gatewayFee;
  const creatorShare = netAmount * ((100 - platformPct) / 100);
  const platformFee = netAmount - creatorShare;
  const referralCommission = Math.min(platformFee * (cfg.referralOfPlatformPct / 100), platformFee);
  const platformKeeps = platformFee - referralCommission;
  return {
    customerPays: round2(price),
    baseAmount: round2(baseAmount),
    gstAmount: round2(gstAmount),
    gatewayFee: round2(gatewayFee),
    netAmount: round2(netAmount),
    creatorShare: round2(creatorShare),
    platformFee: round2(platformFee),
    referralCommission: round2(referralCommission),
    platformKeeps: round2(platformKeeps),
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const tierLabel = (tier: CourseTier | null | undefined): string =>
  tier === 'advanced' ? 'Advanced' : tier === 'basic' ? 'Basic' : 'Untiered';
