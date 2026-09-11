ALTER TABLE public.marketing_subscribers
  ADD COLUMN IF NOT EXISTS pephub_welcome_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pephub_welcome_triggered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pephub_welcome_event_name text,
  ADD COLUMN IF NOT EXISTS pephub_welcome_error text,
  ADD COLUMN IF NOT EXISTS pephub_welcome_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pephub_welcome_last_attempt_at timestamptz;

UPDATE public.marketing_subscribers
SET pephub_welcome_status = 'skipped'
WHERE pephub_welcome_status = 'pending';

ALTER TABLE public.marketing_subscribers
  ADD CONSTRAINT marketing_subscribers_pephub_welcome_status_check
  CHECK (pephub_welcome_status IN ('pending', 'processing', 'triggered', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS marketing_subscribers_pephub_welcome_status_idx
  ON public.marketing_subscribers (pephub_welcome_status);