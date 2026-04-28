ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway_fee_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_fee_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_commission_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_user_id UUID,
  ADD COLUMN IF NOT EXISTS is_platform_course BOOLEAN DEFAULT false;

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'creator';