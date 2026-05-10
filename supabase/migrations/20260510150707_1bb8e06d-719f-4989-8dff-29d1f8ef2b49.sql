
-- Standardize successful payment status
UPDATE public.payments SET status = 'success' WHERE status = 'paid';

-- Prevent duplicate affiliate commissions for the same payment + referrer
CREATE UNIQUE INDEX IF NOT EXISTS commissions_payment_referrer_uniq
  ON public.commissions (payment_id, referrer_user_id)
  WHERE referrer_user_id IS NOT NULL;

-- Prevent duplicate wallet credits for the same source event
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_ref_source_user_uniq
  ON public.wallet_transactions (reference_id, source, user_id)
  WHERE reference_id IS NOT NULL;

-- Prevent duplicate creator payouts for the same payment
CREATE UNIQUE INDEX IF NOT EXISTS creator_payouts_payment_creator_uniq
  ON public.creator_payouts (payment_id, creator_id);

-- Webhook event idempotency
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS razorpay_event_id text;
CREATE UNIQUE INDEX IF NOT EXISTS webhook_logs_razorpay_event_id_uniq
  ON public.webhook_logs (razorpay_event_id)
  WHERE razorpay_event_id IS NOT NULL;
