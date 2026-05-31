-- =========================================================
-- Weekly Automatic Payouts (additive only)
-- =========================================================

-- 1. Per-user auto-payout opt-out + saved payout details on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_payout_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_upi_id text,
  ADD COLUMN IF NOT EXISTS payout_bank_name text,
  ADD COLUMN IF NOT EXISTS payout_account_holder text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS payout_ifsc_code text;

-- 2. Source marker on payout_requests (manual vs auto_weekly)
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- 3. payout_runs table (idempotency ledger for weekly runs)
CREATE TABLE IF NOT EXISTS public.payout_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'running',
  users_processed integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by text NOT NULL DEFAULT 'cron',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT ON public.payout_runs TO authenticated;
GRANT ALL ON public.payout_runs TO service_role;

ALTER TABLE public.payout_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pruns_admin_read" ON public.payout_runs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Private config table for the cron shared secret (service-role / superuser only)
CREATE TABLE IF NOT EXISTS public.app_config (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies = deny all for anon/authenticated. service_role & postgres bypass RLS.

-- 5. Single source of truth for withdrawable balance (mirrors the wallet UI math)
CREATE OR REPLACE FUNCTION public.wallet_available_balance(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(amount) FROM public.wallet_transactions
       WHERE user_id = _user_id AND type = 'credit' AND status = 'completed'
         AND (available_after IS NULL OR available_after <= now())), 0)
    - COALESCE((SELECT SUM(amount) FROM public.wallet_transactions
       WHERE user_id = _user_id AND type IN ('debit','withdrawal') AND status = 'completed'), 0)
    - COALESCE((SELECT SUM(amount) FROM public.wallet_transactions
       WHERE user_id = _user_id AND type IN ('debit','withdrawal') AND status = 'pending'), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.wallet_available_balance(uuid) TO authenticated, service_role;

-- 6. Scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;