
-- Table 1: module_gate_settings
CREATE TABLE IF NOT EXISTS public.module_gate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id),
  is_sequential boolean NOT NULL DEFAULT false,
  has_audio_note boolean NOT NULL DEFAULT false,
  audio_note_r2_key text,
  audio_note_duration_seconds integer DEFAULT 0,
  audio_note_label text DEFAULT 'Message from your mentor',
  audio_note_position text DEFAULT 'before',
  has_mentor_gate boolean NOT NULL DEFAULT false,
  mentor_gate_message text DEFAULT '',
  mentor_contact_type text DEFAULT 'whatsapp',
  zoom_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(module_id)
);

ALTER TABLE public.module_gate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gs_admin" ON public.module_gate_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gs_creator" ON public.module_gate_settings
  FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "gs_student_read" ON public.module_gate_settings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = auth.uid()
    AND course_id = module_gate_settings.course_id
  ));

-- Table 2: mentor_unlock_requests
CREATE TABLE IF NOT EXISTS public.mentor_unlock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  locked_module_id uuid NOT NULL REFERENCES public.modules(id),
  completed_module_id uuid NOT NULL REFERENCES public.modules(id),
  mentor_email text NOT NULL,
  mentor_user_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'waiting',
  student_contacted_at timestamptz,
  contact_method text,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, locked_module_id)
);

CREATE INDEX idx_unlock_requests_mentor ON public.mentor_unlock_requests(mentor_user_id);
CREATE INDEX idx_unlock_requests_student ON public.mentor_unlock_requests(student_id);
CREATE INDEX idx_unlock_requests_status ON public.mentor_unlock_requests(status);

ALTER TABLE public.mentor_unlock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ur_admin" ON public.mentor_unlock_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ur_student" ON public.mentor_unlock_requests
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "ur_mentor" ON public.mentor_unlock_requests
  FOR ALL TO authenticated
  USING (auth.uid() = mentor_user_id);

-- Table 3: creator_pro_subscriptions
CREATE TABLE IF NOT EXISTS public.creator_pro_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  razorpay_subscription_id text,
  amount_per_month numeric DEFAULT 999,
  currency text DEFAULT 'INR',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  pro_started_at timestamptz,
  pro_ends_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.creator_pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_admin" ON public.creator_pro_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ps_creator_read" ON public.creator_pro_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "ps_creator_insert" ON public.creator_pro_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Add columns to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_creator_pro boolean DEFAULT false;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS is_gated boolean DEFAULT false;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS gate_type text;
