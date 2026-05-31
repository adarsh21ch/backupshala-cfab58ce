
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_source_check
  CHECK (source = ANY (ARRAY[
    'referral_commission'::text,
    'creator_earning'::text,
    'course_sale'::text,
    'withdrawal_requested'::text,
    'withdrawal_processed'::text,
    'withdrawal_reversed'::text,
    'admin_adjustment'::text
  ]));
