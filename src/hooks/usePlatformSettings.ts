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
}

const defaults: PlatformSettings = {
  platform_name: 'Backupshala',
  platform_fee_percent: 15,
  default_commission_percent: 30,
  min_payout_amount: 500,
  support_email: 'support@backupshala.com',
  razorpay_enabled: true,
  maintenance_mode: false,
};

export const usePlatformSettings = () => {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      if (!data) return defaults;
      const map: Record<string, string> = {};
      data.forEach(s => { map[s.key] = s.value; });
      return {
        platform_name: map.platform_name || defaults.platform_name,
        platform_fee_percent: Number(map.platform_fee_percent) || defaults.platform_fee_percent,
        default_commission_percent: Number(map.default_commission_percent) || defaults.default_commission_percent,
        min_payout_amount: Number(map.min_payout_amount) || defaults.min_payout_amount,
        support_email: map.support_email || defaults.support_email,
        razorpay_enabled: map.razorpay_enabled === 'true',
        maintenance_mode: map.maintenance_mode === 'true',
      } as PlatformSettings;
    },
    staleTime: 60_000,
  });
};
