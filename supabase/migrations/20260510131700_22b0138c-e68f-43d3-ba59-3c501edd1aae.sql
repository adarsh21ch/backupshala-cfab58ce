INSERT INTO public.platform_settings (key, value) VALUES
  ('certificate_body_line', 'has successfully completed'),
  ('certificate_signature_url', ''),
  ('certificate_email_subject', '🎓 Your Backupshala Certificate is ready')
ON CONFLICT (key) DO NOTHING;