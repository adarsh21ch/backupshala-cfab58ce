
-- 1. Create helper function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Create wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  total_earned numeric(12,2) NOT NULL DEFAULT 0,
  total_withdrawn numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT wallets_total_earned_non_negative CHECK (total_earned >= 0),
  CONSTRAINT wallets_total_withdrawn_non_negative CHECK (total_withdrawn >= 0)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_sel_own" ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "wallet_admin_all" ON public.wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal', 'refund')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  source text NOT NULL CHECK (source IN ('referral_commission', 'creator_earning', 'course_sale', 'withdrawal_processed', 'withdrawal_reversed', 'admin_adjustment')),
  reference_id uuid,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  available_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wt_sel_own" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "wt_admin_all" ON public.wallet_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Indexes
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_available_after ON public.wallet_transactions(available_after);

-- 5. Auto-create wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_wallet_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_wallet();

-- 6. Auto-update timestamp
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
