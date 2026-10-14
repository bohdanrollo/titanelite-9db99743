import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type S = { dose_enabled: boolean; dose_hour: number; checkin_enabled: boolean; checkin_weekday: number; checkin_hour: number; timezone: string };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export default function ReminderSettings() {
  const { user } = useAuth();
  const [s, setS] = useState<S | null>(null);

  useEffect(() => {
    if (!user) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    supabase.from("reminder_settings").select("dose_enabled, dose_hour, checkin_enabled, checkin_weekday, checkin_hour, timezone").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setS(data ?? { dose_enabled: false, dose_hour: 8, checkin_enabled: false, checkin_weekday: 0, checkin_hour: 9, timezone: tz }));
  }, [user]);

  async function save(next: S) {
    if (!user) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || next.timezone;
    const v = { ...next, timezone: tz };
    setS(v);
    const { error } = await supabase.from("reminder_settings").upsert({ user_id: user.id, ...v });
    if (error) toast.error("Could not save reminders"); else toast.success("Reminders saved");
  }

  if (!s) return <p className="mt-2 text-xs text-muted-foreground">Loading…</p>;
  const sel = "rounded-xl bg-muted px-3 py-2 text-sm";
  return (
    <div className="mt-3 space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 min-w-48 items-center gap-2">
          <input type="checkbox" checked={s.dose_enabled} onChange={(e) => save({ ...s, dose_enabled: e.target.checked })} />
          <span><span className="block">Daily dose reminder</span><span className="text-xs text-muted-foreground">Emails today's My Stack schedule</span></span>
        </label>
        <select className={sel} value={s.dose_hour} onChange={(e) => save({ ...s, dose_hour: Number(e.target.value) })} aria-label="Dose reminder time">
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 min-w-48 items-center gap-2">
          <input type="checkbox" checked={s.checkin_enabled} onChange={(e) => save({ ...s, checkin_enabled: e.target.checked })} />
          <span><span className="block">Weekly check-in</span><span className="text-xs text-muted-foreground">Reminder to log progress</span></span>
        </label>
        <select className={sel} value={s.checkin_weekday} onChange={(e) => save({ ...s, checkin_weekday: Number(e.target.value) })} aria-label="Check-in day">
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <select className={sel} value={s.checkin_hour} onChange={(e) => save({ ...s, checkin_hour: Number(e.target.value) })} aria-label="Check-in time">
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">Sent by email in your time zone ({s.timezone}), within the hour you pick.</p>
    </div>
  );
}
