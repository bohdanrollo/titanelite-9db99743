ALTER TABLE public.pephub_posts ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'general';
CREATE INDEX IF NOT EXISTS pephub_posts_channel_created_idx ON public.pephub_posts (channel, created_at DESC);
ALTER TABLE public.pephub_posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pephub_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  END;
END $$;