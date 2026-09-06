ALTER TABLE public.pephub_sources
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS x_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS telegram_url text,
  ADD COLUMN IF NOT EXISTS reddit_url text,
  ADD COLUMN IF NOT EXISTS other_social_url text,
  ADD COLUMN IF NOT EXISTS monitor_socials boolean NOT NULL DEFAULT true;