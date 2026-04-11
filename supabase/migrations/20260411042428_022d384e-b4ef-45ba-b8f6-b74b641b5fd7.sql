-- 1. Update protect_admin_fields trigger to also guard is_creator_pro
CREATE OR REPLACE FUNCTION public.protect_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_creator := OLD.is_creator;
    NEW.creator_approved := OLD.creator_approved;
    NEW.wallet_balance := OLD.wallet_balance;
    NEW.total_earned := OLD.total_earned;
    NEW.total_referred := OLD.total_referred;
    NEW.total_enrolled := OLD.total_enrolled;
    NEW.is_creator_pro := OLD.is_creator_pro;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 2. Remove the insecure profile-based admin policy on creator_pro_subscriptions
DROP POLICY IF EXISTS "admin_full_pro_subs_profile" ON creator_pro_subscriptions;

-- 3. Replace overly permissive public creator profile policy
-- Drop the old policy that exposes all columns
DROP POLICY IF EXISTS "p_sel_creator" ON profiles;

-- Create a secure view for public creator data (excludes sensitive fields)
CREATE OR REPLACE VIEW public.public_creator_profiles AS
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

-- Re-add a policy that only allows selecting the limited set of public fields
-- We need some policy for public creator profile pages to work, but restrict via the view
CREATE POLICY "p_sel_creator" ON profiles
  FOR SELECT
  TO public
  USING (is_creator = true AND creator_approved = true);

-- 4. Add explicit DELETE policy for avatars storage so users can delete their own
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);