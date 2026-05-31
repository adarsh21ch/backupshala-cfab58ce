// Shared tier helpers for edge functions.
// pricing_tiers is the ONLY source of truth for tier name / price / status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type TierStatus = "live" | "coming_soon" | "hidden";

export interface PricingTier {
  id: string;
  slug: string;
  name: string;
  price: number;
  status: TierStatus;
}

/** Fetch a single tier by slug using a service-role client. */
export async function getTierBySlug(
  supabase: ReturnType<typeof createClient>,
  slug: string,
): Promise<PricingTier | null> {
  const { data } = await supabase
    .from("pricing_tiers")
    .select("id, slug, name, price, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return { ...data, price: Number(data.price) } as PricingTier;
}
