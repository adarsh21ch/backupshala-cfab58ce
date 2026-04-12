
-- Phase 10: Course Discussions
CREATE TABLE public.course_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  module_id uuid,
  parent_id uuid,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_discussions_course ON public.course_discussions(course_id, created_at DESC);
CREATE INDEX idx_discussions_parent ON public.course_discussions(parent_id) WHERE parent_id IS NOT NULL;

CREATE POLICY "cd_admin" ON public.course_discussions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cd_read_enrolled" ON public.course_discussions FOR SELECT TO authenticated
  USING (
    is_deleted = false AND (
      EXISTS (SELECT 1 FROM enrollments WHERE student_id = auth.uid() AND course_id = course_discussions.course_id)
      OR EXISTS (SELECT 1 FROM courses WHERE id = course_discussions.course_id AND creator_id = auth.uid())
    )
  );

CREATE POLICY "cd_insert_enrolled" ON public.course_discussions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM enrollments WHERE student_id = auth.uid() AND course_id = course_discussions.course_id)
  );

CREATE POLICY "cd_update_own" ON public.course_discussions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "cd_delete_creator" ON public.course_discussions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_discussions.course_id AND creator_id = auth.uid())
  );

-- Phase 11: User Module Notes
CREATE TABLE public.user_module_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.user_module_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "umn_own" ON public.user_module_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Phase 11: Learning Streaks
CREATE TABLE public.learning_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  streak_date date NOT NULL DEFAULT CURRENT_DATE,
  modules_completed integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_date)
);

ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ls_own" ON public.learning_streaks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Phase 11: Module Quizzes
CREATE TABLE public.module_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL UNIQUE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  passing_score integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mq_admin" ON public.module_quizzes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "mq_creator" ON public.module_quizzes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_quizzes.module_id AND c.creator_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_quizzes.module_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "mq_read_enrolled" ON public.module_quizzes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m JOIN enrollments e ON e.course_id = m.course_id
      WHERE m.id = module_quizzes.module_id AND e.student_id = auth.uid()
    )
  );

-- Phase 11: Quiz Attempts
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_own" ON public.quiz_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "qa_creator_read" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
      WHERE m.id = quiz_attempts.module_id AND c.creator_id = auth.uid()
    )
  );

-- Phase 12: Coupon Codes
CREATE TABLE public.coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  creator_id uuid,
  course_id uuid,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_admin" ON public.coupon_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cc_creator_own" ON public.coupon_codes FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "cc_read_active" ON public.coupon_codes FOR SELECT TO authenticated
  USING (is_active = true);

-- Phase 12: Creator Announcements
CREATE TABLE public.creator_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  course_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_admin" ON public.creator_announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ca_creator_own" ON public.creator_announcements FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "ca_read_enrolled" ON public.creator_announcements FOR SELECT TO authenticated
  USING (
    course_id IS NULL OR
    EXISTS (SELECT 1 FROM enrollments WHERE student_id = auth.uid() AND course_id = creator_announcements.course_id)
  );

-- Phase 12: Drip content - add release_after_days to modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS release_after_days integer NOT NULL DEFAULT 0;

-- Phase 12: Track coupon usage in payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS coupon_id uuid;
