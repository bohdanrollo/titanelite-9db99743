
-- Affiliate applications and approved affiliates
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text,
  email text NOT NULL,
  phone text NOT NULL,
  desired_code text NOT NULL,
  code text UNIQUE,
  instagram text,
  tiktok text,
  youtube text,
  twitter text,
  other_social text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  referral_count integer NOT NULL DEFAULT 0,
  earnings_cents integer NOT NULL DEFAULT 0,
  admin_notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT INSERT ON public.affiliates TO anon;
GRANT ALL ON public.affiliates TO service_role;

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Anyone (even not signed in) can apply
CREATE POLICY "Anyone can apply" ON public.affiliates
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND code IS NULL AND referral_count = 0 AND earnings_cents = 0);

-- Users can see their own affiliate row (by user_id link or matching email)
CREATE POLICY "Users see own affiliate" ON public.affiliates
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Admins see and manage all
CREATE POLICY "Admins select all affiliates" ON public.affiliates
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all affiliates" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete affiliates" ON public.affiliates
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referrals: one row per person who signs up via a code
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates see own referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_referrals.affiliate_id
        AND (a.user_id = auth.uid()
             OR lower(a.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
    )
  );

CREATE POLICY "Admins see all referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- Trigger: recompute referral count + earnings ($25 per 5 referrals)
CREATE OR REPLACE FUNCTION public.recompute_affiliate_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aff_id uuid;
  cnt integer;
BEGIN
  aff_id := COALESCE(NEW.affiliate_id, OLD.affiliate_id);
  SELECT COUNT(*) INTO cnt FROM public.affiliate_referrals WHERE affiliate_id = aff_id;
  UPDATE public.affiliates
    SET referral_count = cnt,
        earnings_cents = (cnt / 5) * 2500,
        updated_at = now()
    WHERE id = aff_id;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_affiliate_totals() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_referrals_recompute
  AFTER INSERT OR DELETE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.recompute_affiliate_totals();
