CREATE TABLE public.coach_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL DEFAULT 'fitness',
  requested_start timestamptz NOT NULL,
  approved_start timestamptz,
  duration_minutes integer NOT NULL DEFAULT 30,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_calls TO authenticated;
GRANT ALL ON public.coach_calls TO service_role;

ALTER TABLE public.coach_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own coach calls" ON public.coach_calls
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Users create own coach calls" ON public.coach_calls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own coach calls" ON public.coach_calls
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Admins update coach calls" ON public.coach_calls
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE INDEX idx_coach_calls_user ON public.coach_calls(user_id);
CREATE INDEX idx_coach_calls_status ON public.coach_calls(status);

CREATE TRIGGER trg_coach_calls_updated_at BEFORE UPDATE ON public.coach_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();