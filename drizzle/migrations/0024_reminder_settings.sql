CREATE TABLE public.reminder_settings (
  user_id uuid PRIMARY KEY,
  dose_enabled boolean NOT NULL DEFAULT false,
  dose_hour smallint NOT NULL DEFAULT 8 CHECK (dose_hour BETWEEN 0 AND 23),
  checkin_enabled boolean NOT NULL DEFAULT false,
  checkin_weekday smallint NOT NULL DEFAULT 0 CHECK (checkin_weekday BETWEEN 0 AND 6),
  checkin_hour smallint NOT NULL DEFAULT 9 CHECK (checkin_hour BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'America/New_York',
  last_dose_sent_on date,
  last_checkin_sent_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_settings TO authenticated;
GRANT ALL ON public.reminder_settings TO service_role;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reminder settings select" ON public.reminder_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own reminder settings insert" ON public.reminder_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own reminder settings update" ON public.reminder_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own reminder settings delete" ON public.reminder_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_reminder_settings_updated_at BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();