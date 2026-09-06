ALTER TABLE public.pephub_sources
  ADD COLUMN listing_category text NOT NULL DEFAULT 'trusted';

ALTER TABLE public.pephub_sources
  ADD CONSTRAINT pephub_sources_listing_category_check
  CHECK (listing_category IN ('featured', 'trusted', 'more'));
