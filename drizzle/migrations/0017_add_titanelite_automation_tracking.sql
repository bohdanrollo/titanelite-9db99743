ALTER TABLE public.marketing_subscribers
  ADD COLUMN IF NOT EXISTS titanelite_welcome_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS titanelite_welcome_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS titanelite_welcome_event_name TEXT,
  ADD COLUMN IF NOT EXISTS titanelite_welcome_error TEXT,
  ADD COLUMN IF NOT EXISTS titanelite_welcome_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS titanelite_welcome_last_attempt_at TIMESTAMPTZ;

-- Existing subscribers must never be emailed because this integration was installed.
UPDATE public.marketing_subscribers
  SET titanelite_welcome_status = 'skipped'
  WHERE titanelite_welcome_status = 'pending';

ALTER TABLE public.marketing_subscribers
  DROP CONSTRAINT IF EXISTS marketing_subscribers_titanelite_welcome_status_check;
ALTER TABLE public.marketing_subscribers
  ADD CONSTRAINT marketing_subscribers_titanelite_welcome_status_check
  CHECK (titanelite_welcome_status IN ('pending','processing','triggered','failed','skipped'));

CREATE INDEX IF NOT EXISTS marketing_subscribers_titanelite_welcome_status_idx
  ON public.marketing_subscribers (titanelite_welcome_status);