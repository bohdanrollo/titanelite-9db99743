
CREATE TABLE public.peptide_stacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT,
  unit TEXT,
  frequency TEXT,
  schedule TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peptide_stacks TO authenticated;
GRANT ALL ON public.peptide_stacks TO service_role;

ALTER TABLE public.peptide_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own peptide stacks"
  ON public.peptide_stacks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_peptide_stacks_updated_at
  BEFORE UPDATE ON public.peptide_stacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_peptide_stacks_user ON public.peptide_stacks(user_id, created_at DESC);
