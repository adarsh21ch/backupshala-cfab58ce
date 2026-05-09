-- Create public storage bucket for course PDFs/resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-resources', 'course-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of resource files
DROP POLICY IF EXISTS "course_resources_public_read" ON storage.objects;
CREATE POLICY "course_resources_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-resources');

-- Authenticated users may upload into their own folder (object name starts with their uid)
DROP POLICY IF EXISTS "course_resources_owner_insert" ON storage.objects;
CREATE POLICY "course_resources_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-resources'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "course_resources_owner_update" ON storage.objects;
CREATE POLICY "course_resources_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-resources'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "course_resources_owner_delete" ON storage.objects;
CREATE POLICY "course_resources_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-resources'
  AND auth.uid()::text = (storage.foldername(name))[1]
);