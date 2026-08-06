CREATE TABLE public.affiliate_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  url text NOT NULL,
  platform text,
  claimed_views integer NOT NULL DEFAULT 0,
  approved_views integer,
  status text NOT NULL DEFAULT 'pending',
  payout_cents integer NOT NULL DEFAULT 0,
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.affiliate_videos TO authenticated;
GRANT ALL ON public.affiliate_videos TO service_role;

ALTER TABLE public.affiliate_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own video submissions"
  ON public.affiliate_videos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

CREATE POLICY "Admins can view all video submissions"
  ON public.affiliate_videos FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Affiliates can submit their own videos"
  ON public.affiliate_videos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid() AND a.status = 'approved'));

CREATE TRIGGER trg_affiliate_videos_updated_at
  BEFORE UPDATE ON public.affiliate_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_affiliate_videos_affiliate ON public.affiliate_videos(affiliate_id);
CREATE INDEX idx_affiliate_videos_status ON public.affiliate_videos(status);

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS video_earnings_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_video_earnings_cents integer NOT NULL DEFAULT 0;