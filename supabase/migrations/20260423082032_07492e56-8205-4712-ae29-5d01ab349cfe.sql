-- Step 2: Per-module video setting overrides
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS allow_seek BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allow_speed_change BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_watch_percent INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_watermark BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_source TEXT DEFAULT 'url';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'modules' AND constraint_name = 'modules_video_source_check'
  ) THEN
    ALTER TABLE public.modules
      ADD CONSTRAINT modules_video_source_check
      CHECK (video_source IN ('r2', 'url', 'youtube', 'vimeo'));
  END IF;
END $$;

-- Seed new platform_settings keys
INSERT INTO public.platform_settings (key, value) VALUES
  ('video_watermark_position', 'bottom-right'),
  ('video_watermark_opacity', '60'),
  ('video_watermark_size', 'medium'),
  ('max_preview_modules_per_course', '2')
ON CONFLICT (key) DO NOTHING;

-- Step 1: Wallet trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_wallet();