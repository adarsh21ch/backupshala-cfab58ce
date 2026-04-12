import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreatorProStatus {
  isPro: boolean;
  plan: string | null;
  status: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  isExpiringSoon: boolean;
  subscription: any;
}

export const useCreatorPro = () => {
  const { user, profile } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['creator-pro-subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('*')
        .eq('creator_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = profile?.is_admin ?? false;
  const isActiveSub = subscription &&
    ['pro', 'trial'].includes(subscription.plan) &&
    subscription.status === 'active';

  const expiresAt = subscription?.pro_ends_at || subscription?.trial_ends_at || null;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isPro = isAdmin || !!isActiveSub;

  return {
    isPro,
    isAdmin,
    plan: subscription?.plan || null,
    status: subscription?.status || null,
    expiresAt,
    daysRemaining,
    isExpiringSoon: daysRemaining !== null && daysRemaining <= 7,
    subscription,
    isLoading,
  } as CreatorProStatus & { isAdmin: boolean; isLoading: boolean };
};
