-- Ensure column exists (idempotent — already in schema)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_platform_course BOOLEAN NOT NULL DEFAULT false;

-- Mark Backupshala Standard Bundle as a platform course
UPDATE public.courses
   SET is_platform_course = true
 WHERE slug = 'backupshala-standard-bundle';