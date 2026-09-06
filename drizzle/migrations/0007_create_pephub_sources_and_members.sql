CREATE TABLE public.pephub_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  description text,
  category text,
  discount_code text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pephub_sources TO anon;
GRANT SELECT ON public.pephub_sources TO authenticated;
GRANT ALL ON public.pephub_sources TO service_role;

ALTER TABLE public.pephub_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sources" ON public.pephub_sources
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage sources" ON public.pephub_sources
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_pephub_sources_updated_at
  BEFORE UPDATE ON public.pephub_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pephub_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  subscribed boolean NOT NULL DEFAULT true,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pephub_members TO authenticated;
GRANT ALL ON public.pephub_members TO service_role;

ALTER TABLE public.pephub_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view pephub members" ON public.pephub_members
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_pephub_members_updated_at
  BEFORE UPDATE ON public.pephub_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pephub_source_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.pephub_sources(id) ON DELETE SET NULL,
  headline text NOT NULL,
  details text,
  promo_code text,
  recipients integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pephub_source_alerts TO authenticated;
GRANT ALL ON public.pephub_source_alerts TO service_role;

ALTER TABLE public.pephub_source_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view alerts" ON public.pephub_source_alerts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));