CREATE TABLE public.lab_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  age integer,
  height text,
  weight text,
  sex text,
  notes text,
  file_paths text[] NOT NULL DEFAULT '{}',
  analysis text,
  analyzed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_analyses TO authenticated;
GRANT ALL ON public.lab_analyses TO service_role;

ALTER TABLE public.lab_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own lab analyses"
ON public.lab_analyses FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_lab_analyses_updated_at
BEFORE UPDATE ON public.lab_analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();