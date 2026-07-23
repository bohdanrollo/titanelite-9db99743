
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value_int bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read app_settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins write app_settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.app_settings (key, value_int) VALUES ('affiliate_payout_cents_per_5', 2500)
  ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recompute_affiliate_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  aff_id uuid;
  cnt integer;
  rate_cents bigint;
BEGIN
  aff_id := COALESCE(NEW.affiliate_id, OLD.affiliate_id);
  SELECT COUNT(*) INTO cnt FROM public.affiliate_referrals WHERE affiliate_id = aff_id;
  SELECT COALESCE(value_int, 2500) INTO rate_cents FROM public.app_settings WHERE key = 'affiliate_payout_cents_per_5';
  IF rate_cents IS NULL THEN rate_cents := 2500; END IF;
  UPDATE public.affiliates
    SET referral_count = cnt,
        earnings_cents = (cnt / 5) * rate_cents,
        updated_at = now()
    WHERE id = aff_id;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_all_affiliate_totals()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rate_cents bigint;
BEGIN
  SELECT COALESCE(value_int, 2500) INTO rate_cents FROM public.app_settings WHERE key = 'affiliate_payout_cents_per_5';
  IF rate_cents IS NULL THEN rate_cents := 2500; END IF;
  UPDATE public.affiliates a
    SET earnings_cents = (COALESCE(sub.cnt, 0) / 5) * rate_cents,
        referral_count = COALESCE(sub.cnt, 0),
        updated_at = now()
    FROM (
      SELECT affiliate_id, COUNT(*)::int AS cnt
      FROM public.affiliate_referrals
      GROUP BY affiliate_id
    ) sub
    WHERE a.id = sub.affiliate_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.recompute_all_affiliate_totals() FROM PUBLIC;
