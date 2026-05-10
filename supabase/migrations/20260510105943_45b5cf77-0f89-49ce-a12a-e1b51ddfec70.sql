
-- 1. Revoke EXECUTE on internal SECURITY DEFINER trigger/helper functions.
--    These should only run from triggers — never directly from the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_wallet() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_admin_fields() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_referrer_email_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- has_role, verify_certificate, get_my_profile remain callable (intentional public APIs).

-- 2. Hard guarantee: no duplicate enrollments per (student, course).
--    Belt-and-suspenders for the existing app-level idempotency check.
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_uniq
  ON public.enrollments (student_id, course_id);
