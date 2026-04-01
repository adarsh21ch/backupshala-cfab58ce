
-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS prevent_referrer_email_change_trigger ON public.profiles;
DROP TRIGGER IF EXISTS prevent_referrer_email_update ON public.profiles;
DROP TRIGGER IF EXISTS protect_admin_fields_trigger ON public.profiles;

-- Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_referrer_email_change() CASCADE;
DROP FUNCTION IF EXISTS public.protect_admin_fields() CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS public.payout_requests CASCADE;
DROP TABLE IF EXISTS public.commissions CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.module_completions CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.creator_payouts CASCADE;
DROP TABLE IF EXISTS public.course_reviews CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ======= TABLES =======

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL, email text NOT NULL, phone text, avatar_url text, bio text,
  is_creator boolean DEFAULT false NOT NULL, is_admin boolean DEFAULT false NOT NULL,
  creator_approved boolean DEFAULT false NOT NULL, creator_slug text UNIQUE,
  creator_display_name text, creator_category text, creator_website text,
  creator_instagram text, creator_youtube text,
  wallet_balance numeric DEFAULT 0 NOT NULL, total_earned numeric DEFAULT 0 NOT NULL,
  total_referred integer DEFAULT 0 NOT NULL, total_enrolled integer DEFAULT 0 NOT NULL,
  referrer_email text DEFAULT 'none@backupshala.com' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles NOT NULL,
  title text NOT NULL, slug text NOT NULL UNIQUE,
  short_description text NOT NULL DEFAULT '', full_description text,
  thumbnail_url text, preview_video_url text,
  category text NOT NULL DEFAULT 'Other', language text DEFAULT 'English', level text DEFAULT 'Beginner',
  price numeric NOT NULL DEFAULT 0, commission_percent numeric DEFAULT 30 NOT NULL,
  platform_fee_percent numeric DEFAULT 15 NOT NULL,
  what_you_learn text[] DEFAULT '{}', requirements text[] DEFAULT '{}', tags text[] DEFAULT '{}',
  total_modules integer DEFAULT 0, total_duration_minutes integer DEFAULT 0,
  total_students integer DEFAULT 0, rating numeric DEFAULT 0, total_reviews integer DEFAULT 0,
  status text DEFAULT 'draft' NOT NULL, rejection_reason text, is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses ON DELETE CASCADE NOT NULL,
  title text NOT NULL, description text, video_url text NOT NULL,
  duration_minutes integer DEFAULT 0, order_index integer DEFAULT 0,
  is_preview boolean DEFAULT false, created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles NOT NULL,
  course_id uuid REFERENCES public.courses NOT NULL,
  creator_id uuid REFERENCES public.profiles NOT NULL,
  razorpay_order_id text UNIQUE, razorpay_payment_id text UNIQUE,
  amount_total numeric NOT NULL, platform_fee_amount numeric NOT NULL,
  commission_amount numeric NOT NULL, creator_payout_amount numeric NOT NULL,
  currency text DEFAULT 'INR', status text DEFAULT 'pending' NOT NULL,
  invoice_number text UNIQUE, gst_amount numeric NOT NULL DEFAULT 0,
  base_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL, paid_at timestamptz
);

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles NOT NULL,
  course_id uuid REFERENCES public.courses NOT NULL,
  referrer_email text NOT NULL DEFAULT 'none@backupshala.com',
  payment_id uuid REFERENCES public.payments,
  amount_paid numeric NOT NULL DEFAULT 0,
  enrolled_at timestamptz DEFAULT now() NOT NULL, completed_at timestamptz,
  is_completed boolean DEFAULT false NOT NULL,
  UNIQUE(student_id, course_id)
);

CREATE TABLE public.module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles NOT NULL,
  module_id uuid REFERENCES public.modules NOT NULL,
  course_id uuid REFERENCES public.courses NOT NULL,
  completed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, module_id)
);

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email text NOT NULL, referrer_user_id uuid REFERENCES public.profiles,
  student_id uuid REFERENCES public.profiles NOT NULL,
  course_id uuid REFERENCES public.courses NOT NULL,
  payment_id uuid REFERENCES public.payments NOT NULL,
  amount numeric NOT NULL, status text DEFAULT 'credited' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles NOT NULL,
  payment_id uuid REFERENCES public.payments NOT NULL,
  amount numeric NOT NULL, status text DEFAULT 'pending' NOT NULL,
  paid_at timestamptz, created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles NOT NULL,
  request_type text NOT NULL, amount numeric NOT NULL,
  bank_name text, account_holder_name text, account_number text,
  ifsc_code text, upi_id text, status text DEFAULT 'pending' NOT NULL,
  admin_note text, requested_at timestamptz DEFAULT now() NOT NULL, processed_at timestamptz
);

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles NOT NULL,
  course_id uuid REFERENCES public.courses NOT NULL,
  creator_id uuid REFERENCES public.profiles NOT NULL,
  certificate_code text UNIQUE NOT NULL,
  issued_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, course_id)
);

CREATE TABLE public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles NOT NULL,
  course_id uuid REFERENCES public.courses NOT NULL,
  rating integer NOT NULL, review_text text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, course_id),
  CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles NOT NULL,
  title text NOT NULL, message text NOT NULL,
  type text DEFAULT 'info' NOT NULL, action_url text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, value text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ======= RLS =======
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "p_sel_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "p_sel_creator" ON public.profiles FOR SELECT USING (is_creator = true AND creator_approved = true);
CREATE POLICY "p_sel_admin" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "p_ins" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "p_upd_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "p_upd_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- courses policies
CREATE POLICY "c_sel_pub" ON public.courses FOR SELECT USING (status = 'published');
CREATE POLICY "c_sel_own" ON public.courses FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "c_ins" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "c_upd" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "c_admin" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- modules policies
CREATE POLICY "m_sel_preview" ON public.modules FOR SELECT USING (is_preview = true AND EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.status = 'published'));
CREATE POLICY "m_sel_enrolled" ON public.modules FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.student_id = auth.uid() AND enrollments.course_id = modules.course_id));
CREATE POLICY "m_creator" ON public.modules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.creator_id = auth.uid()));
CREATE POLICY "m_admin" ON public.modules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payments policies
CREATE POLICY "pay_sel_student" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "pay_sel_creator" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "pay_admin" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- enrollments policies
CREATE POLICY "e_sel_student" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "e_sel_creator" ON public.enrollments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.creator_id = auth.uid()));
CREATE POLICY "e_admin" ON public.enrollments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- module_completions policies
CREATE POLICY "mc_ins" ON public.module_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "mc_sel_student" ON public.module_completions FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "mc_sel_creator" ON public.module_completions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = module_completions.course_id AND courses.creator_id = auth.uid()));
CREATE POLICY "mc_admin" ON public.module_completions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- commissions policies
CREATE POLICY "com_sel" ON public.commissions FOR SELECT TO authenticated USING (referrer_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "com_admin" ON public.commissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- creator_payouts policies
CREATE POLICY "cp_sel" ON public.creator_payouts FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "cp_admin" ON public.creator_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payout_requests policies
CREATE POLICY "pr_ins" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_sel" ON public.payout_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pr_admin" ON public.payout_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- certificates policies
CREATE POLICY "cert_sel_own" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "cert_verify" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "cert_admin" ON public.certificates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- course_reviews policies
CREATE POLICY "rev_sel" ON public.course_reviews FOR SELECT USING (true);
CREATE POLICY "rev_ins" ON public.course_reviews FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.student_id = auth.uid() AND enrollments.course_id = course_reviews.course_id AND enrollments.is_completed = true));
CREATE POLICY "rev_admin" ON public.course_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notifications policies
CREATE POLICY "n_sel" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n_upd" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n_admin" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- platform_settings policies
CREATE POLICY "ps_admin" ON public.platform_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ps_read" ON public.platform_settings FOR SELECT USING (true);

-- ======= TRIGGERS =======
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, referrer_email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'referrer_email', 'none@backupshala.com'));
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.id, 'Welcome to Backupshala! 🎉', 'Start exploring courses!', 'info');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_referrer_email_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.referrer_email IS DISTINCT FROM NEW.referrer_email THEN
    RAISE EXCEPTION 'referrer_email cannot be changed after account creation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_referrer_email_change_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_referrer_email_change();

CREATE OR REPLACE FUNCTION public.protect_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_admin := OLD.is_admin; NEW.is_creator := OLD.is_creator;
    NEW.creator_approved := OLD.creator_approved; NEW.wallet_balance := OLD.wallet_balance;
    NEW.total_earned := OLD.total_earned; NEW.total_referred := OLD.total_referred;
    NEW.total_enrolled := OLD.total_enrolled;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_admin_fields_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_admin_fields();

-- ======= SEED =======
INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_fee_percent', '15'), ('min_payout_amount', '500'),
  ('razorpay_enabled', 'true'), ('maintenance_mode', 'false');
