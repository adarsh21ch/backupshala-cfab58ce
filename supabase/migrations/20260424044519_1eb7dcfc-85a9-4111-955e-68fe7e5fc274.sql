-- Allow creators to delete their own uploaded video assets
CREATE POLICY "va_creator_delete_own"
ON public.video_assets
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Also let creators update (e.g. soft-suspend) their own uploads
CREATE POLICY "va_creator_update_own"
ON public.video_assets
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());