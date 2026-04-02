
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_key_unique UNIQUE (key);

INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_name', 'Backupshala'),
  ('platform_fee_percent', '15'),
  ('default_commission_percent', '30'),
  ('min_payout_amount', '500'),
  ('support_email', 'support@backupshala.com'),
  ('razorpay_enabled', 'true'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
