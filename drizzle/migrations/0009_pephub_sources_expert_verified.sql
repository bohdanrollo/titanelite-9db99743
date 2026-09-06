ALTER TABLE public.pephub_sources
  ADD COLUMN IF NOT EXISTS expert_verified boolean NOT NULL DEFAULT false;

UPDATE public.pephub_sources SET expert_verified = true WHERE lower(name) LIKE '%powerbuilt%';