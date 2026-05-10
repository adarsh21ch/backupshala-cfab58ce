
-- Refund tracking on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS razorpay_refund_id text;

-- Refunded flag on enrollments (so refunded enrollments lose access)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS is_refunded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE INDEX IF NOT EXISTS enrollments_active_idx
  ON public.enrollments (student_id, course_id) WHERE is_refunded = false;

-- Profile KYC
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false;

-- Payout requests: KYC + rejection reason + cooldown via single-pending guard
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Only ONE pending/processing payout per user (DB-level cooldown)
CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_one_pending_per_user
  ON public.payout_requests (user_id)
  WHERE status IN ('pending','approved','processing');

-- Invoice number sequence for GST invoices
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.invoice_number_seq');
  RETURN 'BKS-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM anon, authenticated;

-- Commissions audit view for admin reconciliation
CREATE OR REPLACE VIEW public.commissions_audit_v AS
SELECT
  p.id AS payment_id,
  p.created_at,
  p.status,
  p.refund_status,
  p.amount_total,
  p.platform_fee_amount,
  p.commission_amount,
  p.creator_payout_amount,
  p.affiliate_commission_amount,
  p.gst_amount,
  p.gateway_fee_amount,
  (COALESCE(p.platform_fee_amount,0)
    + COALESCE(p.commission_amount,0)
    + COALESCE(p.creator_payout_amount,0)
    + COALESCE(p.affiliate_commission_amount,0)) AS total_distributed,
  c.title AS course_title,
  s.full_name AS student_name,
  cr.full_name AS creator_name
FROM public.payments p
LEFT JOIN public.courses c ON c.id = p.course_id
LEFT JOIN public.profiles s ON s.id = p.student_id
LEFT JOIN public.profiles cr ON cr.id = p.creator_id;

ALTER VIEW public.commissions_audit_v SET (security_invoker = true);
