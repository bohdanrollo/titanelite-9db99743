
-- Columns
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS recruiter_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recruit_earnings_cents integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS affiliates_recruiter_idx ON public.affiliates(recruiter_affiliate_id);

-- Update insert-check policy to include new column
DROP POLICY IF EXISTS "Anyone can apply" ON public.affiliates;
CREATE POLICY "Anyone can apply" ON public.affiliates
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND code IS NULL
    AND referral_count = 0
    AND earnings_cents = 0
    AND recruit_earnings_cents = 0
  );

-- Security definer helper to avoid recursion in the recruits SELECT policy
CREATE OR REPLACE FUNCTION private.my_affiliate_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.affiliates
  WHERE user_id = auth.uid()
     OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
$$;

REVOKE ALL ON FUNCTION private.my_affiliate_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_affiliate_ids() TO authenticated;

DROP POLICY IF EXISTS "Affiliates see own recruits" ON public.affiliates;
CREATE POLICY "Affiliates see own recruits" ON public.affiliates
  FOR SELECT TO authenticated
  USING (recruiter_affiliate_id IN (SELECT private.my_affiliate_ids()));

-- Update trigger to also credit the recruiter $5 every 5 signups a sub-affiliate drives
CREATE OR REPLACE FUNCTION public.recompute_affiliate_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  aff_id uuid;
  rate_cents bigint;
  new_count integer;
  recruiter_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    aff_id := NEW.affiliate_id;
    SELECT COALESCE(payout_cents_per_5, 2500), recruiter_affiliate_id
      INTO rate_cents, recruiter_id
      FROM public.affiliates WHERE id = aff_id;
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
      IF recruiter_id IS NOT NULL THEN
        UPDATE public.affiliates
          SET recruit_earnings_cents = COALESCE(recruit_earnings_cents, 0) + 500,
              updated_at = now()
          WHERE id = recruiter_id;
      END IF;
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
$function$;
