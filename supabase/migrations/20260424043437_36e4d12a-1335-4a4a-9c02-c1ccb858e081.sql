-- Add available_after to commissions table for hold-period UI filtering
ALTER TABLE public.commissions 
  ADD COLUMN IF NOT EXISTS available_after TIMESTAMPTZ DEFAULT NULL;

-- Backfill existing rows: assume already available (created before hold logic)
UPDATE public.commissions
SET available_after = created_at
WHERE available_after IS NULL;

-- Seed platform settings used by the new referral logic (insert only if absent)
INSERT INTO public.platform_settings (key, value)
VALUES
  ('platform_course_referral_percent', '15'),
  ('referral_commission_percent', '70'),
  ('referral_hold_days', '7'),
  ('creator_hold_days', '3'),
  ('referral_program_enabled', 'true'),
  ('min_referral_payout', '200')
ON CONFLICT (key) DO NOTHING;

-- Ensure profiles.username has a unique index for fast ?ref= lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;