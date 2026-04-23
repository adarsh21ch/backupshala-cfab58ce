
-- Re-add row-level visibility for approved creator rows (needed for course-card / course-detail joins)
DROP POLICY IF EXISTS p_sel_creator ON public.profiles;
CREATE POLICY p_sel_creator ON public.profiles
FOR SELECT TO anon, authenticated
USING (is_creator = true AND creator_approved = true);

-- Revoke column access to PII / financial / role columns from anon + authenticated.
-- Owners (auth.uid() = id) and admins still read everything via p_sel_own / p_sel_admin
-- because those policies grant row access AND the role retains column privileges
-- through grants below — so we only revoke from anon, and re-grant safe columns to authenticated.

REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- Grant back only safe, public-display columns
GRANT SELECT (
  id,
  full_name,
  username,
  avatar_url,
  bio,
  is_creator,
  creator_approved,
  creator_slug,
  creator_display_name,
  creator_category,
  creator_website,
  creator_instagram,
  creator_youtube,
  is_verified,
  is_creator_pro,
  total_enrolled,
  total_referred,
  created_at,
  updated_at
) ON public.profiles TO anon, authenticated;

-- Sensitive columns (email, phone, wallet_balance, total_earned,
-- referrer_email, custom_platform_fee, is_admin) are intentionally NOT granted.
-- The profile owner and admins still read them through the postgres/service_role
-- path used by SECURITY DEFINER helpers and through the existing RLS policies
-- combined with explicit re-grants below for authenticated users on their OWN row
-- via a security-definer view used by the client.

-- Re-grant sensitive columns ONLY where RLS will already restrict to owner/admin.
-- Simpler: grant them to authenticated; RLS p_sel_own/p_sel_admin still gates rows,
-- and p_sel_creator's row-set combined with missing column grants would block anon
-- but allow authenticated to read other creators' PII. To prevent that, we keep
-- email/phone/wallet ungranted for authenticated and instead expose owner data
-- through a dedicated SECURITY DEFINER RPC if needed.

-- For owner self-read of email/phone (used in Profile / Receipt pages), use a helper:
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
