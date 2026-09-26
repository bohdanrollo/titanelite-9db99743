ALTER TABLE public.pephub_sources
  ADD COLUMN IF NOT EXISTS inventory_tracking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_data_source text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS inventory_feed_url text,
  ADD COLUMN IF NOT EXISTS inventory_sync_hours integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS last_inventory_sync timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_sync_status text NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS inventory_sync_error text;

CREATE TABLE public.pephub_compounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  category text,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pephub_compound_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compound_id uuid NOT NULL REFERENCES public.pephub_compounds(id) ON DELETE CASCADE,
  alias_key text NOT NULL UNIQUE
);
CREATE TABLE public.pephub_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.pephub_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  product_name text NOT NULL,
  variant_name text,
  compound_id uuid REFERENCES public.pephub_compounds(id) ON DELETE SET NULL,
  match_confidence text NOT NULL DEFAULT 'none',
  strength_text text,
  total_mg numeric,
  price numeric,
  original_price numeric,
  currency text NOT NULL DEFAULT 'USD',
  in_stock boolean,
  product_url text,
  product_image text,
  data_source text NOT NULL DEFAULT 'auto',
  active boolean NOT NULL DEFAULT true,
  missing_count integer NOT NULL DEFAULT 0,
  last_checked timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);
CREATE INDEX idx_pephub_products_compound ON public.pephub_products(compound_id, active);
CREATE INDEX idx_pephub_products_source ON public.pephub_products(source_id, active);
CREATE INDEX idx_pephub_products_name ON public.pephub_products(lower(product_name));
CREATE INDEX idx_pephub_products_updated ON public.pephub_products(updated_at DESC);
CREATE TABLE public.pephub_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.pephub_products(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.pephub_sources(id) ON DELETE CASCADE,
  price numeric,
  original_price numeric,
  in_stock boolean,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pephub_price_history_product ON public.pephub_price_history(product_id, recorded_at DESC);
CREATE TABLE public.pephub_inventory_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.pephub_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  method text,
  added integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  price_changes integer NOT NULL DEFAULT 0,
  deactivated integer NOT NULL DEFAULT 0,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'cron'
);
CREATE INDEX idx_pephub_inventory_syncs_source ON public.pephub_inventory_syncs(source_id, started_at DESC);

GRANT ALL ON public.pephub_compounds, public.pephub_compound_aliases, public.pephub_products, public.pephub_price_history, public.pephub_inventory_syncs TO service_role;
ALTER TABLE public.pephub_compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pephub_compound_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pephub_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pephub_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pephub_inventory_syncs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pephub_products_updated_at BEFORE UPDATE ON public.pephub_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();