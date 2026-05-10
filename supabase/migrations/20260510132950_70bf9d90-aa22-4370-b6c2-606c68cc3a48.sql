INSERT INTO public.platform_settings (key, value)
SELECT 'creator_signup_payment_required', 'false'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key='creator_signup_payment_required');

INSERT INTO public.platform_settings (key, value)
SELECT 'creator_signup_fee', '0'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key='creator_signup_fee');

INSERT INTO public.platform_settings (key, value)
SELECT 'creator_signup_kyc_required', 'true'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key='creator_signup_kyc_required');