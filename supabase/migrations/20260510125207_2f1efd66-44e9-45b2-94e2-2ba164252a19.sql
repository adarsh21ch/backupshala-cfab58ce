UPDATE public.platform_settings SET value='false', updated_at=now() WHERE key='creator_pro_enabled';
INSERT INTO public.platform_settings (key, value)
SELECT 'creator_pro_enabled', 'false'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key='creator_pro_enabled');