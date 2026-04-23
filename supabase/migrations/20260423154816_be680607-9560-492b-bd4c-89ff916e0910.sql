
-- Grant all columns back to authenticated. Row visibility is still gated by RLS:
--   p_sel_own (auth.uid() = id) for owner self-reads
--   p_sel_admin for admins
--   p_sel_creator (is_creator AND creator_approved) for cross-user creator discovery
-- For the cross-user creator-discovery path we accept that authenticated users may see
-- email/phone of approved creators (creators publish these voluntarily on their profiles
-- and the field is already exposed in CreatorUnlockRequests etc).
-- Anonymous (anon) role keeps the restricted column subset granted in the previous migration.
GRANT SELECT ON public.profiles TO authenticated;
