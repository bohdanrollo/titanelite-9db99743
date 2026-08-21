CREATE TABLE IF NOT EXISTS public.affiliate_product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 10000,
  referral_count_at_request integer NOT NULL DEFAULT 0,
  notes text,
  shipping_address text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_product_requests TO authenticated;
GRANT ALL ON public.affiliate_product_requests TO service_role;

ALTER TABLE public.affiliate_product_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view their own product requests" ON public.affiliate_product_requests;
CREATE POLICY "Affiliates can view their own product requests"
ON public.affiliate_product_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all product requests" ON public.affiliate_product_requests;
CREATE POLICY "Admins can view all product requests"
ON public.affiliate_product_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP TRIGGER IF EXISTS trg_affiliate_product_requests_updated_at ON public.affiliate_product_requests;
CREATE TRIGGER trg_affiliate_product_requests_updated_at
BEFORE UPDATE ON public.affiliate_product_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_affiliate_product_requests_affiliate ON public.affiliate_product_requests(affiliate_id);