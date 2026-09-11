ALTER TABLE public.marketing_subscribers
  ADD COLUMN IF NOT EXISTS welcome_email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_broadcast_id text,
  ADD COLUMN IF NOT EXISTS welcome_message_id text,
  ADD COLUMN IF NOT EXISTS welcome_email_error text;

-- Existing subscribers must never receive the welcome broadcast just because
-- this integration was installed.
UPDATE public.marketing_subscribers
SET welcome_email_status = 'skipped'
WHERE welcome_email_status = 'pending';