CREATE TABLE public.marketing_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  subscribed boolean NOT NULL DEFAULT true,
  unsubscribed_at timestamptz,
  source text NOT NULL DEFAULT 'pephub',
  resend_contact_id text,
  migrated_to_resend boolean NOT NULL DEFAULT false,
  resend_sync_status text NOT NULL DEFAULT 'pending',
  resend_sync_error text,
  resend_last_synced_at timestamptz,
  legacy_pephub_member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX marketing_subscribers_email_key ON public.marketing_subscribers (lower(email));
CREATE INDEX marketing_subscribers_status_idx ON public.marketing_subscribers (resend_sync_status);

GRANT SELECT ON public.marketing_subscribers TO authenticated;
GRANT ALL ON public.marketing_subscribers TO service_role;

ALTER TABLE public.marketing_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read subscribers"
ON public.marketing_subscribers FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_marketing_subscribers_updated_at
BEFORE UPDATE ON public.marketing_subscribers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.marketing_subscribers
  (user_id, email, first_name, last_name, subscribed, unsubscribed_at, source,
   legacy_pephub_member_id, created_at, updated_at)
SELECT
  p.id,
  lower(trim(m.email)),
  NULLIF(split_part(trim(m.name), ' ', 1), ''),
  NULLIF(trim(substring(trim(m.name) from position(' ' in trim(m.name)) + 1)), ''),
  m.subscribed AND NOT EXISTS (
    SELECT 1 FROM public.suppressed_emails s WHERE lower(s.email) = lower(trim(m.email))
  ),
  COALESCE(m.unsubscribed_at, CASE WHEN NOT m.subscribed THEN m.updated_at END),
  'pephub',
  m.id,
  m.created_at,
  now()
FROM public.pephub_members m
LEFT JOIN public.profiles p ON lower(p.email) = lower(trim(m.email))
ON CONFLICT (lower(email)) DO NOTHING;