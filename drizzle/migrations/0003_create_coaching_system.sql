-- Coaches
CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  profile_photo text,
  bio text NOT NULL DEFAULT '',
  specialty text NOT NULL DEFAULT 'fitness',
  status text NOT NULL DEFAULT 'pending',
  timezone text NOT NULL DEFAULT 'America/New_York',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.coaches TO authenticated;
GRANT ALL ON public.coaches TO service_role;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach reads own row" ON public.coaches
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );
CREATE POLICY "Coach creates own row" ON public.coaches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coach updates own row" ON public.coaches
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update coaches" ON public.coaches
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE INDEX idx_coaches_status ON public.coaches(status);
CREATE INDEX idx_coaches_specialty ON public.coaches(specialty);
CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Weekly recurring availability (Mon=1 .. Fri=5)
CREATE TABLE public.coach_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '20:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, day_of_week)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_availability TO authenticated;
GRANT ALL ON public.coach_availability TO service_role;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach reads own availability" ON public.coach_availability
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );
CREATE POLICY "Coach writes own availability" ON public.coach_availability
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Coach updates own availability" ON public.coach_availability
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
  );

CREATE INDEX idx_coach_availability_coach ON public.coach_availability(coach_id);
CREATE TRIGGER trg_coach_availability_updated_at BEFORE UPDATE ON public.coach_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scheduled appointments between a coach and an existing client (auth user)
CREATE TABLE public.coach_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.coach_calls(id) ON DELETE SET NULL,
  call_type text NOT NULL DEFAULT 'fitness',
  specialty text NOT NULL DEFAULT 'fitness',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'upcoming',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_appointments TO authenticated;
GRANT ALL ON public.coach_appointments TO service_role;
ALTER TABLE public.coach_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read appointments" ON public.coach_appointments
  FOR SELECT TO authenticated USING (
    auth.uid() = client_id
    OR EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );
CREATE POLICY "Coach updates own appointments" ON public.coach_appointments
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Admins manage appointments" ON public.coach_appointments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE INDEX idx_coach_appointments_coach_start ON public.coach_appointments(coach_id, start_time);
CREATE INDEX idx_coach_appointments_client ON public.coach_appointments(client_id);
CREATE INDEX idx_coach_appointments_status ON public.coach_appointments(status);
CREATE TRIGGER trg_coach_appointments_updated_at BEFORE UPDATE ON public.coach_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications (channel-agnostic so email/SMS/push can be layered on later)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  related_call_id uuid REFERENCES public.coach_appointments(id) ON DELETE CASCADE,
  send_after timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_send_after ON public.notifications(send_after);

-- Link existing client-side call requests to an assigned coach
ALTER TABLE public.coach_calls ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL;