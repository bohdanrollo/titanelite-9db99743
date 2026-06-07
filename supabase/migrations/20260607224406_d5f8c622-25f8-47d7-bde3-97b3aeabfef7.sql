
-- purchases: extend for Stripe subscriptions and invoice tracking
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS last_invoice_id text,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_session_unique
  ON public.purchases (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS purchases_subscription_idx
  ON public.purchases (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- protocols: AI-drafted content + PDF delivery state
ALTER TABLE public.protocols
  ADD COLUMN IF NOT EXISTS draft_content jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_intake_id uuid;

DO $$ BEGIN
  ALTER TABLE public.protocols
    ADD CONSTRAINT protocols_source_intake_fk
    FOREIGN KEY (source_intake_id) REFERENCES public.intakes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.protocols
    ADD CONSTRAINT protocols_status_check
    CHECK (status IN ('draft', 'delivered', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- intakes: link to the purchase that paid for it
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS purchase_id uuid;

DO $$ BEGIN
  ALTER TABLE public.intakes
    ADD CONSTRAINT intakes_purchase_fk
    FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
