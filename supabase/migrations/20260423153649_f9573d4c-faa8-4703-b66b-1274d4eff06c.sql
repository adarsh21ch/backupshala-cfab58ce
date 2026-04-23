-- Fix 1: Restrict videos table — remove public read, require enrollment/creator/admin
DROP POLICY IF EXISTS vid_sel_public ON public.videos;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='videos') THEN
    -- Re-create stricter policies
    DROP POLICY IF EXISTS vid_sel_enrolled ON public.videos;
    DROP POLICY IF EXISTS vid_sel_creator ON public.videos;
    DROP POLICY IF EXISTS vid_sel_admin ON public.videos;

    EXECUTE 'CREATE POLICY vid_sel_admin ON public.videos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role))';

    -- Try a creator-owner policy if uploaded_by exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='videos' AND column_name='uploaded_by') THEN
      EXECUTE 'CREATE POLICY vid_sel_creator ON public.videos FOR SELECT TO authenticated USING (auth.uid() = uploaded_by)';
    END IF;

    -- Enrolled students: video referenced by a module they are enrolled in
    EXECUTE $POL$
      CREATE POLICY vid_sel_enrolled ON public.videos
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.modules m
        JOIN public.enrollments e ON e.course_id = m.course_id
        WHERE m.video_id = videos.id AND e.student_id = auth.uid()
      ))
    $POL$;
  END IF;
END$$;

-- Fix 2: Lock down creator_pro_subscriptions — only admins/service-role can write.
-- Creators can still READ their own subscription. Writes must go via verified-payment edge function (service role bypasses RLS).
DROP POLICY IF EXISTS ps_creator_insert ON public.creator_pro_subscriptions;
DROP POLICY IF EXISTS ps_creator_update ON public.creator_pro_subscriptions;

-- Fix 3: folder_shares — let the sharer (shared_by) read their own share rows
DROP POLICY IF EXISTS fs_sharedby_read ON public.folder_shares;
CREATE POLICY fs_sharedby_read ON public.folder_shares
FOR SELECT TO authenticated
USING (auth.uid() = shared_by);

-- Fix 4: Restrict storage object listing on public buckets to authenticated users only.
-- Public read of individual files via direct URL still works (public bucket); listing is no longer anonymous.
DROP POLICY IF EXISTS "Public bucket files are viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public buckets list authenticated only" ON storage.objects;
CREATE POLICY "Public buckets list authenticated only"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id IN ('avatars', 'course-thumbnails'));