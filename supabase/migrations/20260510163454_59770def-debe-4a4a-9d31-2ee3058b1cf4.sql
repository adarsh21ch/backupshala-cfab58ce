
-- course_chapters: enrolled access excludes refunded
DROP POLICY IF EXISTS cc_sel_enrolled ON public.course_chapters;
CREATE POLICY cc_sel_enrolled ON public.course_chapters
  FOR SELECT TO authenticated
  USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id = course_chapters.course_id
        AND e.is_refunded = false
    )
  );

-- modules: enrolled access excludes refunded
DROP POLICY IF EXISTS m_sel_enrolled ON public.modules;
CREATE POLICY m_sel_enrolled ON public.modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id = modules.course_id
        AND e.is_refunded = false
    )
  );

-- module_quizzes: enrolled access excludes refunded
DROP POLICY IF EXISTS mq_read_enrolled ON public.module_quizzes;
CREATE POLICY mq_read_enrolled ON public.module_quizzes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE m.id = module_quizzes.module_id
        AND e.student_id = auth.uid()
        AND e.is_refunded = false
    )
  );

-- course_discussions: read & insert excludes refunded
DROP POLICY IF EXISTS cd_read_enrolled ON public.course_discussions;
CREATE POLICY cd_read_enrolled ON public.course_discussions
  FOR SELECT TO authenticated
  USING (
    is_deleted = false AND (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.student_id = auth.uid()
          AND e.course_id = course_discussions.course_id
          AND e.is_refunded = false
      )
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_discussions.course_id
          AND c.creator_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS cd_insert_enrolled ON public.course_discussions;
CREATE POLICY cd_insert_enrolled ON public.course_discussions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id = course_discussions.course_id
        AND e.is_refunded = false
    )
  );

-- module_gate_settings: refunded students lose access
DROP POLICY IF EXISTS gs_student_read ON public.module_gate_settings;
CREATE POLICY gs_student_read ON public.module_gate_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id = module_gate_settings.course_id
        AND e.is_refunded = false
    )
  );

-- creator_announcements: refunded students lose access to course-specific announcements
DROP POLICY IF EXISTS ca_read_enrolled ON public.creator_announcements;
CREATE POLICY ca_read_enrolled ON public.creator_announcements
  FOR SELECT TO authenticated
  USING (
    course_id IS NULL OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id = creator_announcements.course_id
        AND e.is_refunded = false
    )
  );
