-- Admin-configurable multi-tier pricing: single source of truth for tier name/price/status.

-- 1. pricing_tiers table
CREATE TABLE public.pricing_tiers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  price         numeric(12,2) NOT NULL CHECK (price >= 0),
  tagline       text,
  description   text,
  features      jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge         text,
  highlight     boolean NOT NULL DEFAULT false,
  status        text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('live','coming_soon','hidden')),
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_tiers TO authenticated;
GRANT ALL ON public.pricing_tiers TO service_role;

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_public_read" ON public.pricing_tiers
  FOR SELECT TO anon, authenticated
  USING (status IN ('live','coming_soon'));

CREATE POLICY "pt_admin_all" ON public.pricing_tiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. tier_waitlist (coming-soon "Notify me")
CREATE TABLE public.tier_waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_slug  text NOT NULL,
  email      text NOT NULL,
  user_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_slug, email)
);

GRANT INSERT ON public.tier_waitlist TO anon;
GRANT SELECT, INSERT ON public.tier_waitlist TO authenticated;
GRANT ALL ON public.tier_waitlist TO service_role;

ALTER TABLE public.tier_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tw_insert_any" ON public.tier_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "tw_admin_read" ON public.tier_waitlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Link courses -> tiers (backward compatible, keeps existing columns)
ALTER TABLE public.courses
  ADD COLUMN tier_slug text REFERENCES public.pricing_tiers(slug) ON UPDATE CASCADE;

-- 4. Seed launch tiers (Starter live, rest coming_soon)
INSERT INTO public.pricing_tiers (slug, name, price, tagline, description, features, badge, highlight, status, display_order) VALUES
  ('starter',  'Starter',  499,   'Your digital-skills starter pack', 'Curated resources, expert guidance and community access to kickstart your journey.', '["Curated learning resources","Private community access","Certificate of completion","Lifetime access"]'::jsonb, NULL, false, 'live', 1),
  ('growth',   'Growth',   2499,  'Level up with deeper training', 'Everything in Starter plus advanced modules and hands-on projects.', '["Everything in Starter","Advanced modules","Hands-on projects","Priority support"]'::jsonb, 'Most Popular', true, 'coming_soon', 2),
  ('advanced', 'Advanced', 5999,  'For serious skill-builders', 'Comprehensive curriculum with mentorship and live sessions.', '["Everything in Growth","1:1 mentorship","Live sessions","Portfolio reviews"]'::jsonb, NULL, false, 'coming_soon', 3),
  ('elite',    'Elite',    9999,  'Accelerate to pro level', 'Premium training with personalised coaching and career support.', '["Everything in Advanced","Personalised coaching","Career support","Exclusive workshops"]'::jsonb, NULL, false, 'coming_soon', 4),
  ('premium',  'Premium',  14999, 'The complete mastery program', 'Our most complete program with everything we offer.', '["Everything in Elite","Lifetime mentorship","Done-with-you projects","VIP community"]'::jsonb, NULL, false, 'coming_soon', 5);