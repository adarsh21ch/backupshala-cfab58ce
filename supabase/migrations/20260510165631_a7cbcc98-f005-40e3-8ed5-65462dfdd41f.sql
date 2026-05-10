
DROP FUNCTION IF EXISTS public.verify_certificate(text);

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS revoked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
 RETURNS TABLE(certificate_code text, course_id uuid, student_id uuid, creator_id uuid, issued_at timestamptz, revoked boolean, revoked_at timestamptz, revoked_reason text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT certificate_code, course_id, student_id, creator_id, issued_at, revoked, revoked_at, revoked_reason
  FROM public.certificates WHERE certificate_code = _code LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.wallet_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id uuid,
  amount_owed numeric NOT NULL CHECK (amount_owed > 0),
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'refund_shortfall',
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wa_user_idx ON public.wallet_adjustments(user_id);
CREATE INDEX IF NOT EXISTS wa_status_idx ON public.wallet_adjustments(status);

ALTER TABLE public.wallet_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_admin ON public.wallet_adjustments;
CREATE POLICY wa_admin ON public.wallet_adjustments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS wa_sel_own ON public.wallet_adjustments;
CREATE POLICY wa_sel_own ON public.wallet_adjustments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.wallet_credit_idempotent(
  _user_id uuid, _amount numeric, _source text, _description text,
  _reference_id uuid, _hold_days int DEFAULT 0
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wallet_id uuid;
  _avail timestamptz := CASE WHEN _hold_days > 0 THEN now() + (_hold_days || ' days')::interval ELSE NULL END;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN false; END IF;
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _user_id;
  BEGIN
    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, type, amount, source, reference_id, description, status, available_after)
    VALUES (_wallet_id, _user_id, 'credit', _amount, _source, _reference_id, _description, 'completed', _avail);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
  UPDATE public.wallets
    SET balance = balance + _amount,
        total_earned = total_earned + _amount,
        updated_at = now()
    WHERE id = _wallet_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_apply_refund_reversal(
  _user_id uuid, _amount numeric, _payment_id uuid, _source text, _description text
) RETURNS TABLE(debited numeric, shortfall numeric, adjustment_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wallet_id uuid; _balance numeric; _earned numeric;
  _take numeric; _short numeric; _adj_id uuid;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, NULL::uuid; RETURN;
  END IF;
  SELECT id, balance, total_earned INTO _wallet_id, _balance, _earned
    FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id)
      RETURNING id, balance, total_earned INTO _wallet_id, _balance, _earned;
  END IF;
  _take := LEAST(_balance, _amount);
  _short := _amount - _take;
  IF _take > 0 THEN
    UPDATE public.wallets
      SET balance = balance - _take,
          total_earned = GREATEST(0, total_earned - _take),
          updated_at = now()
      WHERE id = _wallet_id;
    BEGIN
      INSERT INTO public.wallet_transactions
        (wallet_id, user_id, type, amount, source, reference_id, description, status)
      VALUES (_wallet_id, _user_id, 'debit', _take, _source, _payment_id, _description, 'completed');
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
  IF _short > 0 THEN
    INSERT INTO public.wallet_adjustments (user_id, payment_id, amount_owed, reason, source)
      VALUES (_user_id, _payment_id, _short,
        'Refund reversal exceeded wallet balance — funds already withdrawn', _source)
      RETURNING id INTO _adj_id;
  END IF;
  RETURN QUERY SELECT _take, _short, _adj_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payout_set_processing(_payout_id uuid, _admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _updated int;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.payout_requests SET status = 'processing'
    WHERE id = _payout_id AND status = 'pending';
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payout_complete(
  _payout_id uuid, _admin_id uuid, _utr text, _admin_note text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _amount numeric; _wallet_id uuid; _updated int;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _utr IS NULL OR length(trim(_utr)) = 0 THEN
    RAISE EXCEPTION 'utr_required';
  END IF;
  UPDATE public.payout_requests
    SET status = 'paid', processed_at = now(),
        admin_note = 'UTR: ' || trim(_utr) ||
                     CASE WHEN _admin_note IS NOT NULL AND length(trim(_admin_note))>0
                          THEN ' | ' || trim(_admin_note) ELSE '' END
    WHERE id = _payout_id AND status IN ('pending','processing')
    RETURNING user_id, amount INTO _user_id, _amount;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN RETURN false; END IF;
  SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _user_id;
  IF _wallet_id IS NOT NULL THEN
    UPDATE public.wallets
      SET total_withdrawn = total_withdrawn + _amount, updated_at = now()
      WHERE id = _wallet_id;
    UPDATE public.wallet_transactions SET status = 'completed'
      WHERE reference_id = _payout_id AND user_id = _user_id
        AND type = 'debit' AND status = 'pending';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payout_reject(
  _payout_id uuid, _admin_id uuid, _reason text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _amount numeric; _wallet_id uuid; _updated int;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
  UPDATE public.payout_requests
    SET status = 'rejected', processed_at = now(),
        admin_note = trim(_reason), rejection_reason = trim(_reason)
    WHERE id = _payout_id AND status IN ('pending','processing')
    RETURNING user_id, amount INTO _user_id, _amount;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN RETURN false; END IF;
  SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _user_id;
  IF _wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET balance = balance + _amount, updated_at = now()
      WHERE id = _wallet_id;
    UPDATE public.wallet_transactions
      SET status = 'reversed',
          description = COALESCE(description,'') || ' [rejected: ' || trim(_reason) || ']'
      WHERE reference_id = _payout_id AND user_id = _user_id
        AND type = 'debit' AND status = 'pending';
    BEGIN
      INSERT INTO public.wallet_transactions
        (wallet_id, user_id, type, amount, source, reference_id, description, status)
      VALUES (_wallet_id, _user_id, 'credit', _amount,
              'withdrawal_reversed', _payout_id,
              'Withdrawal rejected: ' || trim(_reason), 'completed');
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
  RETURN true;
END;
$$;
