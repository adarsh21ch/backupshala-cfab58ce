
CREATE TABLE public.creator_video_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  min_watch_percentage_to_complete integer NOT NULL DEFAULT 80,
  allow_speed_control boolean NOT NULL DEFAULT true,
  allow_forward_seeking boolean NOT NULL DEFAULT true,
  video_watermark_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_video_settings ENABLE ROW LEVEL SECURITY;

-- Creators can read and update their own settings
CREATE POLICY "creators_manage_own_video_settings" ON public.creator_video_settings
  FOR ALL USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Admins can read all
CREATE POLICY "admins_read_all_video_settings" ON public.creator_video_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
