
-- Create course_overrides table
CREATE TABLE public.course_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  old_platform_fee numeric,
  new_platform_fee numeric,
  old_commission numeric,
  new_commission numeric,
  old_price numeric,
  new_price numeric,
  reason text NOT NULL,
  applied_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_admin" ON public.course_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
