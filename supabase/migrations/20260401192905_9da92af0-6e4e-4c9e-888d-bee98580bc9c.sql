
-- 1. Attach the protect_admin_fields trigger to profiles (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'protect_admin_fields_trigger') THEN
    CREATE TRIGGER protect_admin_fields_trigger
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_admin_fields();
  END IF;
END $$;

-- 2. Attach the prevent_referrer_email_change trigger to profiles (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_referrer_email_change_trigger') THEN
    CREATE TRIGGER prevent_referrer_email_change_trigger
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.prevent_referrer_email_change();
  END IF;
END $$;

-- 3. Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact"
  ON public.contact_submissions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can manage contact submissions"
  ON public.contact_submissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Insert profile for existing user who signed up before trigger existed
INSERT INTO public.profiles (id, full_name, email, phone, referrer_email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', ''),
  email,
  COALESCE(raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'referrer_email', 'none@backupshala.com')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
