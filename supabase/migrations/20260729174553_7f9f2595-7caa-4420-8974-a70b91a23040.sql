
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS lifetime_earnings_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_recruit_earnings_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_paid_at timestamptz;

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referrer text,
  path text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_created
  ON public.affiliate_clicks(affiliate_id, created_at DESC);

GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Affiliates see own clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT private.my_affiliate_ids()));

-- Anyone (including anonymous) can insert a click record; server function will
-- validate the affiliate code before inserting.
CREATE POLICY "Anyone can log a click" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
