-- Allow creators to delete their own courses (only if no real enrollments)
-- and clear stale rejection reasons on published courses.

-- 1. DELETE policy for creators on own courses (RLS enforces who; app enforces "no enrollments")
CREATE POLICY "c_del_own"
ON public.courses
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- 2. Clear stale rejection_reason on any course that is currently published
UPDATE public.courses
SET rejection_reason = NULL
WHERE status = 'published' AND rejection_reason IS NOT NULL;