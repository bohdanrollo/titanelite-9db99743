-- 1. Allow affiliates to correct/withdraw their own PENDING video submissions
CREATE POLICY "Affiliates update own pending videos"
ON public.affiliate_videos
FOR UPDATE
TO authenticated
USING (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_videos.affiliate_id AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_videos.affiliate_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Affiliates delete own pending videos"
ON public.affiliate_videos
FOR DELETE
TO authenticated
USING (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_videos.affiliate_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins delete video submissions"
ON public.affiliate_videos
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 2. Email-based affiliate visibility now requires a VERIFIED email
DROP POLICY IF EXISTS "Users see own affiliate" ON public.affiliates;

CREATE POLICY "Users see own affiliate"
ON public.affiliates
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    email IS NOT NULL
    AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    AND COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean,
      (auth.jwt() ->> 'email_verified')::boolean,
      false
    ) IS TRUE
  )
);