
-- Add platform-course flag to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_platform_course BOOLEAN NOT NULL DEFAULT false;

-- Mark the Standard Bundle as a platform course
UPDATE public.courses
SET is_platform_course = true
WHERE slug = 'backupshala-standard-bundle';

-- Storage bucket for course thumbnails (uploaded by creators from device)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for thumbnails
DROP POLICY IF EXISTS "Course thumbnails are publicly readable" ON storage.objects;
CREATE POLICY "Course thumbnails are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Authenticated creators can upload to a folder named by their user id
DROP POLICY IF EXISTS "Creators upload their own thumbnails" ON storage.objects;
CREATE POLICY "Creators upload their own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Creators update their own thumbnails" ON storage.objects;
CREATE POLICY "Creators update their own thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Creators delete their own thumbnails" ON storage.objects;
CREATE POLICY "Creators delete their own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
