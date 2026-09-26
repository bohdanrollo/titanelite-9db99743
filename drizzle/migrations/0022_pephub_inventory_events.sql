CREATE TABLE public.pephub_inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('search','click')),
  query text,
  product_id uuid REFERENCES public.pephub_products(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.pephub_sources(id) ON DELETE SET NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pephub_inventory_events TO service_role;
ALTER TABLE public.pephub_inventory_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX pephub_inventory_events_type_created ON public.pephub_inventory_events(event_type, created_at DESC);
CREATE INDEX pephub_price_history_product_recorded ON public.pephub_price_history(product_id, recorded_at);