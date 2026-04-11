-- Fix: Change view to SECURITY INVOKER
DROP VIEW IF EXISTS public.public_creator_profiles;

CREATE VIEW public.public_creator_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  creator_display_name,
  creator_slug,
  creator_category,
  creator_website,
  creator_instagram,
  creator_youtube,
  avatar_url,
  bio,
  is_creator,
  creator_approved
FROM profiles
WHERE is_creator = true AND creator_approved = true;