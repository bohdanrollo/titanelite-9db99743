ALTER TABLE public.marketing_subscribers
  ADD COLUMN IF NOT EXISTS age_21_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS research_use_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledgements_confirmed_at timestamptz;

-- Existing members signed up before these confirmations existed; keep their
-- access intact by recording their prior acceptance at their signup time.
UPDATE public.marketing_subscribers
SET age_21_confirmed = true,
    research_use_confirmed = true,
    acknowledgements_confirmed_at = COALESCE(acknowledgements_confirmed_at, created_at)
WHERE acknowledgements_confirmed_at IS NULL;