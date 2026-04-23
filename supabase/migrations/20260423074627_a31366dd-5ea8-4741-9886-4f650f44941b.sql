-- Add tier and pricing fields to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_tier text CHECK (course_tier IN ('basic','advanced')),
  ADD COLUMN IF NOT EXISTS base_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS display_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS original_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS admin_override_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS admin_override_label text,
  ADD COLUMN IF NOT EXISTS admin_override_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add tier to modules
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS module_tier text NOT NULL DEFAULT 'basic' CHECK (module_tier IN ('basic','advanced'));

-- Add tier to enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic','advanced'));

-- Add per-creator custom platform fee + username for referrals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_platform_fee numeric(5,2),
  ADD COLUMN IF NOT EXISTS username text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(lower(username));

-- New: course_upgrades table
CREATE TABLE IF NOT EXISTS public.course_upgrades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  original_payment_id uuid,
  upgrade_payment_id uuid,
  amount_paid numeric(12,2) NOT NULL,
  from_tier text NOT NULL DEFAULT 'basic',
  to_tier text NOT NULL DEFAULT 'advanced',
  upgraded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_upgrades_user ON public.course_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_course_upgrades_course ON public.course_upgrades(course_id);

ALTER TABLE public.course_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY cu_admin
  ON public.course_upgrades
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cu_sel_own
  ON public.course_upgrades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for tier filtering
CREATE INDEX IF NOT EXISTS idx_courses_course_tier ON public.courses(course_tier);
CREATE INDEX IF NOT EXISTS idx_modules_tier ON public.modules(module_tier);
CREATE INDEX IF NOT EXISTS idx_enrollments_tier ON public.enrollments(tier);