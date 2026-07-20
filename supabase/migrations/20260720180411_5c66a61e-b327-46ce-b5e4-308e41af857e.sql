DROP POLICY IF EXISTS "Users see own affiliate" ON public.affiliates;
CREATE POLICY "Users see own affiliate" ON public.affiliates
FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);