import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TierStatus = 'live' | 'coming_soon' | 'hidden';

export interface PricingTier {
  id: string;
  slug: string;
  name: string;
  price: number;
  tagline: string | null;
  description: string | null;
  features: string[];
  badge: string | null;
  highlight: boolean;
  status: TierStatus;
  display_order: number;
}

const normalize = (row: any): PricingTier => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  price: Number(row.price),
  tagline: row.tagline ?? null,
  description: row.description ?? null,
  features: Array.isArray(row.features) ? row.features : [],
  badge: row.badge ?? null,
  highlight: !!row.highlight,
  status: row.status,
  display_order: row.display_order ?? 0,
});

/**
 * The single source of truth for tier name/price/status on the frontend.
 * `includeHidden` is only honoured for admins (RLS enforces it server-side).
 */
export const usePricingTiers = (includeHidden = false) => {
  return useQuery({
    queryKey: ['pricing-tiers', includeHidden],
    queryFn: async (): Promise<PricingTier[]> => {
      let q = supabase.from('pricing_tiers').select('*').order('display_order', { ascending: true });
      if (!includeHidden) q = q.in('status', ['live', 'coming_soon']);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalize);
    },
    staleTime: 60_000,
  });
};

/**
 * The cheapest currently-live tier — used for marketing copy ("from ₹X").
 * Returns the tier and a formatted "₹X" label, with a loading flag.
 */
export const useEntryLiveTier = () => {
  const { data, isLoading } = usePricingTiers();
  const live = (data || []).filter(t => t.status === 'live').sort((a, b) => a.price - b.price);
  const tier = live[0] ?? null;
  return {
    tier,
    isLoading,
    priceLabel: isLoading || !tier ? '—' : `₹${tier.price.toLocaleString('en-IN')}`,
  };
};
