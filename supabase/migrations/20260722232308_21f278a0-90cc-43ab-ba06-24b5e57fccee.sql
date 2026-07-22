
ALTER TABLE public.user_access ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
CREATE INDEX IF NOT EXISTS idx_user_access_payment_intent ON public.user_access(stripe_payment_intent_id);

CREATE OR REPLACE FUNCTION public.has_access(_user_id uuid, _min_tier text DEFAULT 'limited', _env text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_access ua
      WHERE ua.user_id = _user_id
        AND (_env IS NULL OR ua.environment = _env)
        AND (
          ua.tier = 'full'
          OR (_min_tier = 'limited' AND ua.tier = 'limited')
        )
    );
$$;

REVOKE ALL ON FUNCTION public.has_access(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_access(uuid, text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users manage their own peptide stacks" ON public.peptide_stacks;
CREATE POLICY "Users read own peptide stacks"
  ON public.peptide_stacks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Full access users insert peptide stacks"
  ON public.peptide_stacks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_access(auth.uid(), 'full'));
CREATE POLICY "Full access users update peptide stacks"
  ON public.peptide_stacks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_access(auth.uid(), 'full'))
  WITH CHECK (auth.uid() = user_id AND public.has_access(auth.uid(), 'full'));
CREATE POLICY "Users delete own peptide stacks"
  ON public.peptide_stacks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
