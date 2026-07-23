
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS payout_cents_per_5 bigint NOT NULL DEFAULT 2500;

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
  SELECT COALESCE(payout_cents_per_5, 2500) INTO rate_cents FROM public.affiliates WHERE id = aff_id;
  IF rate_cents IS NULL THEN rate_cents := 2500; END IF;
  UPDATE public.affiliates
    SET referral_count = cnt,
        earnings_cents = (cnt / 5) * rate_cents,
        updated_at = now()
    WHERE id = aff_id;
  RETURN NULL;
END;
$function$;

DROP FUNCTION IF EXISTS public.recompute_all_affiliate_totals();
DROP TABLE IF EXISTS public.app_settings;
