
-- Create video_assets table (R2-based video library)
CREATE TABLE IF NOT EXISTS video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_object_key text NOT NULL,
  bsv_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  tags text[] DEFAULT '{}',
  language text NOT NULL DEFAULT 'English',
  duration_seconds integer NOT NULL DEFAULT 0,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'video/mp4',
  thumbnail_key text,
  status text NOT NULL DEFAULT 'processing',
  total_views integer NOT NULL DEFAULT 0,
  used_in_courses_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_va_status ON video_assets(status);
CREATE INDEX IF NOT EXISTS idx_va_category ON video_assets(category);
CREATE INDEX IF NOT EXISTS idx_va_bsv_code ON video_assets(bsv_code);
CREATE INDEX IF NOT EXISTS idx_va_uploaded_by ON video_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_va_created_at ON video_assets(created_at DESC);

ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "va_admin" ON video_assets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "va_auth_read" ON video_assets FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'ready' AND is_active = true);

CREATE POLICY "va_public_read" ON video_assets FOR SELECT
  USING (status = 'ready' AND is_active = true);

-- Create video_asset_usage table
CREATE TABLE IF NOT EXISTS video_asset_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_asset_id uuid NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_asset_id, module_id)
);

ALTER TABLE video_asset_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vau_admin" ON video_asset_usage FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vau_creator_read" ON video_asset_usage FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "vau_creator_insert" ON video_asset_usage FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Add video_asset_id and bsv_code to modules
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS video_asset_id uuid REFERENCES video_assets(id),
  ADD COLUMN IF NOT EXISTS bsv_code text;

-- Add columns to video_requests for R2 system
ALTER TABLE video_requests
  ADD COLUMN IF NOT EXISTS video_asset_id uuid REFERENCES video_assets(id),
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Add columns to video_watch_progress for enhanced tracking
ALTER TABLE video_watch_progress
  ADD COLUMN IF NOT EXISTS video_asset_id uuid REFERENCES video_assets(id),
  ADD COLUMN IF NOT EXISTS max_watched_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_watched_percentage numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add new platform settings for R2 video system
INSERT INTO platform_settings (key, value) VALUES
  ('min_watch_percentage_to_complete', '80'),
  ('allow_video_speed_control', 'false'),
  ('allow_video_seeking_forward', 'false'),
  ('video_signed_url_expiry_seconds', '14400'),
  ('video_watermark_enabled', 'true'),
  ('video_watermark_text', 'Backupshala'),
  ('max_video_upload_size_gb', '2'),
  ('video_request_processing_hours', '48')
ON CONFLICT (key) DO NOTHING;
