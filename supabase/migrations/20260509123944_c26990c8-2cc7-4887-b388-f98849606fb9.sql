-- ============ Phase 2: foundations for two-tier courses, chapters, PDFs, admin grant ============

-- 1. Enrollments: admin grant + access expiry
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS granted_by_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grant_reason TEXT;

-- 2. Courses: course_level (basic/advanced/creator) — separate from existing course_tier
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_level TEXT
  CHECK (course_level IN ('basic','advanced','creator'));

-- 3. Modules: flag for PDF resources
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS has_pdf_resources BOOLEAN NOT NULL DEFAULT false;

-- 4. Course chapters (videos + optional PDFs inside a module)
CREATE TABLE IF NOT EXISTS public.course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  course_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  chapter_order INTEGER NOT NULL DEFAULT 0,
  video_url TEXT,
  video_asset_id UUID,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  pdf_url TEXT,
  pdf_filename TEXT,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_chapters_module ON public.course_chapters(module_id, chapter_order);
CREATE INDEX IF NOT EXISTS idx_course_chapters_course ON public.course_chapters(course_id);

ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_admin ON public.course_chapters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cc_creator ON public.course_chapters
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_chapters.course_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_chapters.course_id AND c.creator_id = auth.uid()));

CREATE POLICY cc_sel_enrolled ON public.course_chapters
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid() AND e.course_id = course_chapters.course_id
    )
  );

CREATE POLICY cc_sel_preview ON public.course_chapters
  FOR SELECT TO public
  USING (
    is_preview = true AND is_published = true
    AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_chapters.course_id AND c.status = 'published')
  );

CREATE TRIGGER trg_course_chapters_updated
  BEFORE UPDATE ON public.course_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. PDF download logs
CREATE TABLE IF NOT EXISTS public.pdf_download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL,
  course_id UUID NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_user ON public.pdf_download_logs(user_id, downloaded_at DESC);

ALTER TABLE public.pdf_download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pdl_admin ON public.pdf_download_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY pdl_sel_own ON public.pdf_download_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY pdl_ins_own ON public.pdf_download_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Seed platform settings (advanced_price + course id pointers if missing)
INSERT INTO public.platform_settings (key, value)
VALUES ('advanced_price', '4449')
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_settings (key, value)
VALUES ('basic_course_id', '')
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_settings (key, value)
VALUES ('advanced_course_id', '')
ON CONFLICT DO NOTHING;

-- 7. Mark existing platform Standard Bundle as 'basic'
UPDATE public.courses
SET course_level = 'basic'
WHERE is_platform_course = true
  AND course_level IS NULL
  AND (slug ILIKE '%standard-bundle%' OR title ILIKE '%standard bundle%');