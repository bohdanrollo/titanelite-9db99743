ALTER TABLE public.peptide_stacks
  ADD COLUMN IF NOT EXISTS time_slots text[] NOT NULL DEFAULT ARRAY['morning']::text[],
  ADD COLUMN IF NOT EXISTS days_of_week smallint[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::smallint[];

CREATE TABLE IF NOT EXISTS public.peptide_dose_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack_id uuid NOT NULL REFERENCES public.peptide_stacks(id) ON DELETE CASCADE,
  dose_date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning','afternoon','evening')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stack_id, dose_date, time_slot)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peptide_dose_log TO authenticated;
GRANT ALL ON public.peptide_dose_log TO service_role;

ALTER TABLE public.peptide_dose_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own dose log"
  ON public.peptide_dose_log FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_peptide_dose_log_user_date ON public.peptide_dose_log (user_id, dose_date);

CREATE TRIGGER trg_peptide_dose_log_updated_at
  BEFORE UPDATE ON public.peptide_dose_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();