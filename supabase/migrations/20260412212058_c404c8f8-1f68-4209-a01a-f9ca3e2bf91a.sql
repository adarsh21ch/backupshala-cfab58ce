
-- Featured listings table
CREATE TABLE public.featured_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  course_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fl_admin" ON public.featured_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fl_creator_own" ON public.featured_listings FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "fl_creator_insert" ON public.featured_listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "fl_public_read" ON public.featured_listings FOR SELECT TO public
  USING (status = 'active' AND expires_at > now());

-- Add is_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Add commission_type to commissions
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'referral';

-- Seed new platform settings (upsert pattern)
INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_fee_free', '20'),
  ('platform_fee_pro', '10'),
  ('payout_cycle', 'manual'),
  ('affiliate_commission_percent', '15'),
  ('min_affiliate_payout', '200'),
  ('allow_non_student_affiliates', 'false'),
  ('creator_pro_monthly_price', '499'),
  ('creator_pro_annual_price', '3999')
ON CONFLICT (key) DO NOTHING;
