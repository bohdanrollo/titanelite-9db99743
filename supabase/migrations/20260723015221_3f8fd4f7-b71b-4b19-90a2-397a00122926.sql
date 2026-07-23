
CREATE OR REPLACE FUNCTION public.recompute_affiliate_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aff_id uuid;
  rate_cents bigint;
  new_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    aff_id := NEW.affiliate_id;
    SELECT COALESCE(payout_cents_per_5, 2500) INTO rate_cents FROM public.affiliates WHERE id = aff_id;
    IF rate_cents IS NULL THEN rate_cents := 2500; END IF;
    UPDATE public.affiliates
      SET referral_count = COALESCE(referral_count, 0) + 1,
          updated_at = now()
      WHERE id = aff_id
      RETURNING referral_count INTO new_count;
    IF new_count % 5 = 0 THEN
      UPDATE public.affiliates
        SET earnings_cents = COALESCE(earnings_cents, 0) + rate_cents,
            updated_at = now()
        WHERE id = aff_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    aff_id := OLD.affiliate_id;
    UPDATE public.affiliates
      SET referral_count = GREATEST(COALESCE(referral_count, 0) - 1, 0),
          updated_at = now()
      WHERE id = aff_id;
  END IF;
  RETURN NULL;
END;
$$;
