
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS allow_speed_control boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allow_forward_seeking boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_watermark_enabled boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_watch_percentage_to_complete integer DEFAULT NULL;
