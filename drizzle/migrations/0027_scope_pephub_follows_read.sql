DROP POLICY IF EXISTS "signed-in can read follows" ON public.pephub_follows;
CREATE POLICY "members read own follow relationships" ON public.pephub_follows
FOR SELECT TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);