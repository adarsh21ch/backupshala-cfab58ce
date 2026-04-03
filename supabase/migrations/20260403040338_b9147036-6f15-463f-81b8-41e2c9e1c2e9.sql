
-- 1. Create videos table
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  duration_seconds integer DEFAULT 0,
  cloudflare_stream_id text UNIQUE NOT NULL,
  cloudflare_playback_url text NOT NULL,
  cloudflare_thumbnail_url text,
  backupshala_video_link text UNIQUE NOT NULL,
  category text,
  tags text[] DEFAULT '{}',
  language text DEFAULT 'English',
  file_size_mb numeric DEFAULT 0,
  used_in_courses integer DEFAULT 0,
  total_views integer DEFAULT 0,
  uploaded_by uuid REFERENCES public.profiles(id) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vid_admin" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vid_sel_active" ON public.videos FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "vid_sel_public" ON public.videos FOR SELECT TO public
  USING (is_active = true);

-- 2. Create video_usage table
CREATE TABLE public.video_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(video_id, module_id)
);

ALTER TABLE public.video_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vu_ins_own" ON public.video_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "vu_sel_own" ON public.video_usage FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "vu_admin" ON public.video_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create video_requests table
CREATE TABLE public.video_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES public.profiles(id) NOT NULL,
  youtube_url text NOT NULL,
  video_title text NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  admin_note text,
  video_id uuid REFERENCES public.videos(id),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vr_ins_own" ON public.video_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "vr_sel_own" ON public.video_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by);

CREATE POLICY "vr_admin" ON public.video_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create video_watch_progress table
CREATE TABLE public.video_watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  video_id uuid REFERENCES public.videos(id) NOT NULL,
  module_id uuid REFERENCES public.modules(id) NOT NULL,
  course_id uuid REFERENCES public.courses(id) NOT NULL,
  watch_percentage numeric DEFAULT 0,
  last_position_seconds integer DEFAULT 0,
  total_watch_time_seconds integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.video_watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vwp_own" ON public.video_watch_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vwp_creator" ON public.video_watch_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses WHERE courses.id = video_watch_progress.course_id AND courses.creator_id = auth.uid()
  ));

CREATE POLICY "vwp_admin" ON public.video_watch_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add video_id and backupshala_video_link to modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS video_id uuid REFERENCES public.videos(id);
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS backupshala_video_link text;
