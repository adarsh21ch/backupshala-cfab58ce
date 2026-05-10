
-- Replace the creator self-manage policy so creators cannot point coupons
-- at courses they don't own.
DROP POLICY IF EXISTS cc_creator_own ON public.coupon_codes;

CREATE POLICY cc_creator_own_select ON public.coupon_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY cc_creator_own_insert ON public.coupon_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      course_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_id AND c.creator_id = auth.uid()
      )
    )
  );

CREATE POLICY cc_creator_own_update ON public.coupon_codes
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      course_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_id AND c.creator_id = auth.uid()
      )
    )
  );

CREATE POLICY cc_creator_own_delete ON public.coupon_codes
  FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);
