ALTER TABLE public.pephub_sources
  ADD COLUMN IF NOT EXISTS newsletter_signup_url text,
  ADD COLUMN IF NOT EXISTS newsletter_email_domains text,
  ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_subscribed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.pephub_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL UNIQUE,
  source_id uuid REFERENCES public.pephub_sources(id) ON DELETE SET NULL,
  from_email text NOT NULL DEFAULT '',
  from_name text,
  subject text NOT NULL DEFAULT '',
  snippet text,
  received_at timestamptz,
  matched boolean NOT NULL DEFAULT false,
  sale_detected boolean NOT NULL DEFAULT false,
  promotion_id uuid REFERENCES public.pephub_promotions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pephub_inbox_messages TO authenticated;
GRANT ALL ON public.pephub_inbox_messages TO service_role;

ALTER TABLE public.pephub_inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inbox messages"
ON public.pephub_inbox_messages
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_pephub_inbox_received ON public.pephub_inbox_messages (received_at DESC);