-- Allow admins to manage enrollments (needed for "Grant Course Access")
CREATE POLICY e_admin_ins ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY e_admin_upd ON public.enrollments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY e_admin_del ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert notifications for any user (already covered by n_admin ALL, but be explicit-safe)
-- (n_admin already allows ALL) — no change needed.

-- Seed basic_course_id with the existing Standard Bundle
UPDATE public.platform_settings
SET value = '5dd3606e-56ca-45bc-b493-75223a1fd20f', updated_at = now()
WHERE key = 'basic_course_id' AND (value IS NULL OR value = '');