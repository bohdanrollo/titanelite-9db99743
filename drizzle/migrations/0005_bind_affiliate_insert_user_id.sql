DROP POLICY "Anyone can apply" ON public.affiliates;

CREATE POLICY "Anyone can apply"
ON public.affiliates
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND code IS NULL
  AND referral_count = 0
  AND earnings_cents = 0
  AND recruit_earnings_cents = 0
  AND (user_id IS NULL OR user_id = auth.uid())
);