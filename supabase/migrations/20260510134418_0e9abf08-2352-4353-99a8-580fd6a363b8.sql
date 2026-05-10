INSERT INTO public.platform_settings (key, value)
VALUES ('creator_pro_billing_model', 'subscription')
ON CONFLICT (key) DO NOTHING;