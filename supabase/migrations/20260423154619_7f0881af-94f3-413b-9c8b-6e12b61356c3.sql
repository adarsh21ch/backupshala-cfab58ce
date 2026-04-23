
-- ============================================================
-- 1) Privilege-escalation fix: attach protect_admin_fields trigger
-- ============================================================
DROP TRIGGER IF EXISTS protect_admin_fields_trigger ON public.profiles;
CREATE TRIGGER protect_admin_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_fields();

-- ============================================================
-- 2) Public PII exposure: drop broad public SELECT on profiles
--    The public_creator_profiles view (already exposed) returns
--    only safe display columns; clients should use it for public reads.
-- ============================================================
DROP POLICY IF EXISTS p_sel_creator ON public.profiles;

-- ============================================================
-- 3) Certificates: restrict public verification to exact-code lookup
-- ============================================================
DROP POLICY IF EXISTS cert_verify ON public.certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (
  certificate_code text,
  course_id uuid,
  student_id uuid,
  creator_id uuid,
  issued_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT certificate_code, course_id, student_id, creator_id, issued_at
  FROM public.certificates
  WHERE certificate_code = _code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- ============================================================
-- 4) Coupon codes: stop authenticated enumeration of all active coupons
-- ============================================================
DROP POLICY IF EXISTS cc_read_active ON public.coupon_codes;

-- Validation must now go through the existing validate-coupon edge function
-- (service-role bypasses RLS). Creators still see their own; admins see all.
