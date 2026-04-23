import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  platform_name: string;
  platform_fee_percent: number;
  default_commission_percent: number;
  min_payout_amount: number;
  support_email: string;
  razorpay_enabled: boolean;
  maintenance_mode: boolean;
  basic_price: number;
  advanced_price: number;
  upgrade_price: number;
}

const defaults: PlatformSettings = {
  platform_name: 'Backupshala',
  platform_fee_percent: 10,
  default_commission_percent: 70,
  min_payout_amount: 500,
  support_email: 'support@backupshala.com',
  razorpay_enabled: true,
  maintenance_mode: false,
  basic_price: 249,
  advanced_price: 499,
  upgrade_price: 250,
};

export const usePlatformSettings = () => {
  const query = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      const map: Record<string, string> = {};
      if (data) data.forEach(s => { map[s.key] = s.value; });
      const basicPrice = Number(map.basic_price) || defaults.basic_price;
      const advancedPrice = Number(map.advanced_price) || defaults.advanced_price;
      return {
        raw: map,
        parsed: {
          platform_name: map.platform_name || defaults.platform_name,
          platform_fee_percent: Number(map.platform_fee_free) || Number(map.platform_fee_percent) || defaults.platform_fee_percent,
          default_commission_percent: Number(map.referral_commission_percent) || defaults.default_commission_percent,
          min_payout_amount: Number(map.min_payout_amount) || defaults.min_payout_amount,
          support_email: map.support_email || defaults.support_email,
          razorpay_enabled: map.razorpay_enabled === 'true',
          maintenance_mode: map.maintenance_mode === 'true',
          basic_price: basicPrice,
          advanced_price: advancedPrice,
          upgrade_price: Math.max(0, advancedPrice - basicPrice),
        } as PlatformSettings,
      };
    },
    staleTime: 60_000,
  });

  const getSetting = (key: string, fallback: string = ''): string => {
    return query.data?.raw?.[key] ?? fallback;
  };

  return {
    ...query,
    data: query.data?.parsed ?? defaults,
    getSetting,
  };
};
