CREATE TABLE public.member_billing_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 environment text NOT NULL,
 record_type text NOT NULL,
 stripe_id text NOT NULL,
 stripe_customer_id text NOT NULL,
 billing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
 synced_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (environment, record_type, stripe_id)
);
GRANT SELECT ON public.member_billing_records TO authenticated;
GRANT ALL ON public.member_billing_records TO service_role;
ALTER TABLE public.member_billing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read member billing records" ON public.member_billing_records FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE INDEX member_billing_records_user_idx ON public.member_billing_records(user_id, environment);
COMMENT ON TABLE public.member_billing_records IS 'Stripe billing snapshots for matched PepLog members. Informational only; never grants access or marketing consent. No payment credentials stored.';