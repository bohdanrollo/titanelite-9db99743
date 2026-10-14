// Sends dose and weekly check-in reminder emails. Runs from the hourly monitor cron.
import { sendAppEmail } from "@/lib/email/send.server";

function localParts(tz: string) {
  let zone = tz;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); } catch { zone = "America/New_York"; }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday };
}

export async function runDueReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("reminder_settings")
    .select("*")
    .or("dose_enabled.eq.true,checkin_enabled.eq.true");
  if (error) throw error;
  let dose = 0, checkin = 0;
  for (const r of rows ?? []) {
    const now = localParts(r.timezone);
    const doseDue = r.dose_enabled && now.hour === r.dose_hour && r.last_dose_sent_on !== now.date;
    const checkinDue = r.checkin_enabled && now.weekday === r.checkin_weekday && now.hour === r.checkin_hour && r.last_checkin_sent_on !== now.date;
    if (!doseDue && !checkinDue) continue;
    const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", r.user_id).maybeSingle();
    if (!profile?.email) continue;

    if (doseDue) {
      const { data: stacks } = await supabaseAdmin
        .from("peptide_stacks")
        .select("name, dose, unit, time_slots, days_of_week")
        .eq("user_id", r.user_id)
        .eq("active", true);
      const today = (stacks ?? []).filter((s) => !s.days_of_week?.length || s.days_of_week.includes(now.weekday));
      if (today.length) {
        const items = today.map((s) => [s.name, [s.dose, s.unit].filter(Boolean).join(" "), (s.time_slots ?? []).join(", ")].filter(Boolean).join(" · "));
        await sendAppEmail({ templateName: "member-reminder", recipientEmail: profile.email, idempotencyKey: `reminder-dose-${r.user_id}-${now.date}`, templateData: { kind: "dose", items } });
        dose++;
      }
      await supabaseAdmin.from("reminder_settings").update({ last_dose_sent_on: now.date }).eq("user_id", r.user_id);
    }
    if (checkinDue) {
      await sendAppEmail({ templateName: "member-reminder", recipientEmail: profile.email, idempotencyKey: `reminder-checkin-${r.user_id}-${now.date}`, templateData: { kind: "checkin" } });
      await supabaseAdmin.from("reminder_settings").update({ last_checkin_sent_on: now.date }).eq("user_id", r.user_id);
      checkin++;
    }
  }
  return { dose, checkin };
}
