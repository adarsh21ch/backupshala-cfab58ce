
REVOKE ALL ON FUNCTION public.wallet_credit_idempotent(uuid, numeric, text, text, uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_apply_refund_reversal(uuid, numeric, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_payout_set_processing(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_payout_complete(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_payout_reject(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit_idempotent(uuid, numeric, text, text, uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_apply_refund_reversal(uuid, numeric, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_payout_set_processing(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_payout_complete(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_payout_reject(uuid, uuid, text) TO service_role;
