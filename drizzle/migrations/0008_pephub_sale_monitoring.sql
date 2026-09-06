-- 1. Extend trusted sources with monitoring fields
ALTER TABLE public.pephub_sources
  ADD COLUMN IF NOT EXISTS affiliate_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS monitoring_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monitoring_frequency text NOT NULL DEFAULT '6h',
  ADD COLUMN IF NOT EXISTS monitoring_status text NOT NULL DEFAULT 'disabled',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_successful_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sale_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS monitoring_error text,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

-- 2. Detected promotions
CREATE TABLE IF NOT EXISTS public.pephub_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.pephub_sources(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  title text NOT NULL,
  description text,
  discount_type text,
  discount_value text,
  coupon_code text,
  promotion_url text,
  start_date date,
  end_date date,
  confidence_score integer NOT NULL DEFAULT 0,
  confidence_level text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'detected',
  evidence text,
  recipients integer NOT NULL DEFAULT 0,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  missing_since timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pephub_promotions_source_fingerprint_key
  ON public.pephub_promotions (source_id, fingerprint);
CREATE INDEX IF NOT EXISTS pephub_promotions_status_idx ON public.pephub_promotions (status);
CREATE INDEX IF NOT EXISTS pephub_promotions_detected_idx ON public.pephub_promotions (first_detected_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pephub_promotions TO authenticated;
GRANT ALL ON public.pephub_promotions TO service_role;
ALTER TABLE public.pephub_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promotions" ON public.pephub_promotions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TRIGGER trg_pephub_promotions_updated_at BEFORE UPDATE ON public.pephub_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Per-recipient sale email log
CREATE TABLE IF NOT EXISTS public.pephub_sale_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.pephub_promotions(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.pephub_members(id) ON DELETE SET NULL,
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pephub_sale_emails_promo_email_key
  ON public.pephub_sale_emails (promotion_id, lower(email));

GRANT SELECT ON public.pephub_sale_emails TO authenticated;
GRANT ALL ON public.pephub_sale_emails TO service_role;
ALTER TABLE public.pephub_sale_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sale emails" ON public.pephub_sale_emails
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 4. Monitor runs
CREATE TABLE IF NOT EXISTS public.pephub_monitor_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.pephub_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  sales_found integer NOT NULL DEFAULT 0,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'cron'
);
CREATE INDEX IF NOT EXISTS pephub_monitor_runs_started_idx ON public.pephub_monitor_runs (started_at DESC);

GRANT SELECT ON public.pephub_monitor_runs TO authenticated;
GRANT ALL ON public.pephub_monitor_runs TO service_role;
ALTER TABLE public.pephub_monitor_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read monitor runs" ON public.pephub_monitor_runs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 5. Singleton settings (safe rollout: monitor only)
CREATE TABLE IF NOT EXISTS public.pephub_monitor_settings (
  id integer PRIMARY KEY DEFAULT 1,
  automatic_sending boolean NOT NULL DEFAULT false,
  require_admin_approval boolean NOT NULL DEFAULT true,
  minimum_confidence text NOT NULL DEFAULT 'high',
  default_frequency text NOT NULL DEFAULT '6h',
  monitoring_enabled boolean NOT NULL DEFAULT true,
  sale_alerts_enabled boolean NOT NULL DEFAULT true,
  admin_notify_email text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pephub_monitor_settings_singleton CHECK (id = 1)
);

INSERT INTO public.pephub_monitor_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.pephub_monitor_settings TO authenticated;
GRANT ALL ON public.pephub_monitor_settings TO service_role;
ALTER TABLE public.pephub_monitor_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read monitor settings" ON public.pephub_monitor_settings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TRIGGER trg_pephub_monitor_settings_updated_at BEFORE UPDATE ON public.pephub_monitor_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();