import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  LogOut, LayoutDashboard, CalendarDays, Phone, Clock, User, Bell, Loader2, ArrowLeft, CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getMyCoachProfile, saveMyCoachProfile, saveMyAvailability, listMyCoachAppointments,
  setAppointmentStatus, listMyNotifications, markNotificationsRead,
  type Coach, type Availability, type Appointment, type AppNotification,
} from "@/lib/coaching.functions";
import { AvailabilityEditor, normalizeAvailability } from "@/components/coaching/AvailabilityEditor";
import { CalendarView } from "@/components/coaching/CalendarView";
import { CallDetailModal, StatusBadge } from "@/components/coaching/CallDetail";
import { DEFAULT_TZ, TIMEZONES, SPECIALTY_LABEL, CALL_TYPE_LABEL, dateKey, formatDate, formatTime } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Coach Dashboard — Titan Elite" },
      { name: "description", content: "Titan Elite coach portal: today's calls, your calendar, availability and notifications." },
      { property: "og:title", content: "Coach Dashboard — Titan Elite" },
      { property: "og:description", content: "Manage your coaching calls, weekly availability and client sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachPortal,
});

type Tab = "overview" | "calendar" | "calls" | "availability" | "profile" | "notifications";

function CoachPortal() {
  const { signOut } = useAuth();
  const loadProfile = useServerFn(getMyCoachProfile);
  const loadCalls = useServerFn(listMyCoachAppointments);
  const loadNotes = useServerFn(listMyNotifications);

  const [coach, setCoach] = useState<Coach | null>(null);
  const [availability, setAvailability] = useState<Availability[]>(normalizeAvailability([]));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<Appointment | null>(null);

  const tz = coach?.timezone || DEFAULT_TZ;

  const refresh = useCallback(async () => {
    try {
      const p = await loadProfile({ data: {} as never });
      setCoach(p.coach);
      setAvailability(normalizeAvailability(p.availability));
      if (p.coach) {
        const [c, n] = await Promise.all([loadCalls({ data: {} as never }), loadNotes({ data: {} as never })]);
        setAppointments(c.appointments);
        setNotifications(n.notifications);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load your coach profile");
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadCalls, loadNotes]);

  useEffect(() => { refresh(); }, [refresh]);

  const unread = notifications.filter((n) => !n.read).length;

  if (loading) return <div className="min-h-dvh bg-background flex items-center justify-center text-eyebrow">Loading…</div>;

  if (!coach) return <CoachOnboarding onDone={refresh} />;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-foreground/10 bg-ink text-bone">
        <div className="container-edge h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-blood" />
            <span className="font-display text-xl tracking-wider">TITAN ELITE / COACH</span>
          </Link>
          <button onClick={signOut} className="font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:text-blood">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <section className="container-edge py-10">
        <div className="text-eyebrow">Coach Dashboard</div>
        <h1 className="mt-3 text-4xl lg:text-5xl">Welcome, {coach.first_name}.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {SPECIALTY_LABEL[coach.specialty]} · <StatusBadge status={coach.status} kind="coach" /> · {tz.replace("_", " ")}
        </p>

        {coach.status !== "approved" && (
          <div className="mt-6 border border-amber-500/30 bg-amber-500/10 text-amber-800 rounded-2xl px-5 py-4 text-sm">
            Your coach account is <strong>{coach.status}</strong>. Admins can only schedule calls with approved coaches.
            Fill in your profile and availability so you're ready to go.
          </div>
        )}

        <nav className="mt-8 flex flex-wrap gap-1 border-b border-foreground/15">
          {([
            { k: "overview", l: "Overview", i: LayoutDashboard },
            { k: "calendar", l: "My calendar", i: CalendarDays },
            { k: "calls", l: "My calls", i: Phone },
            { k: "availability", l: "Availability", i: Clock },
            { k: "profile", l: "Profile", i: User },
            { k: "notifications", l: `Notifications${unread ? ` (${unread})` : ""}`, i: Bell },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 border-b-2 transition ${tab === t.k ? "border-blood text-blood" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <t.i size={14} /> {t.l}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {tab === "overview" && <Overview appointments={appointments} tz={tz} onSelect={setSelected} />}
          {tab === "calendar" && <CalendarView appointments={appointments} tz={tz} onSelect={setSelected} />}
          {tab === "calls" && <CallsList appointments={appointments} tz={tz} onSelect={setSelected} />}
          {tab === "availability" && <AvailabilityTab value={availability} setValue={setAvailability} onSaved={refresh} />}
          {tab === "profile" && <ProfileForm coach={coach} onSaved={refresh} />}
          {tab === "notifications" && <Notifications notifications={notifications} onRefresh={refresh} tz={tz} />}
        </div>
      </section>

      {selected && (
        <CallDetailModal
          call={selected}
          tz={tz}
          onClose={() => setSelected(null)}
          onStatus={async (status) => {
            try {
              await setAppointmentStatus({ data: { id: selected.id, status } });
              toast.success("Call updated.");
              setSelected(null);
              refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Update failed");
            }
          }}
        />
      )}
    </div>
  );
}

/* ---------------- onboarding ---------------- */

function CoachOnboarding({ onDone }: { onDone: () => void }) {
  return (
    <div className="min-h-dvh bg-background">
      <section className="container-edge py-16 max-w-3xl">
        <Link to="/dashboard" className="inline-flex btn-ghost mb-6"><ArrowLeft size={14} /> Back</Link>
        <div className="text-eyebrow">Coach application</div>
        <h1 className="mt-3 text-4xl lg:text-5xl">Set up your coach profile.</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-xl">
          Tell us who you are and what you coach. An admin reviews and approves every coach before calls can be booked.
        </p>
        <div className="mt-8">
          <ProfileForm coach={null} onSaved={onDone} />
        </div>
      </section>
    </div>
  );
}

/* ---------------- overview ---------------- */

function Overview({ appointments, tz, onSelect }: { appointments: Appointment[]; tz: string; onSelect: (a: Appointment) => void }) {
  const today = dateKey(new Date(), tz);
  const todays = appointments.filter((a) => dateKey(new Date(a.start_time), tz) === today && a.status !== "cancelled");
  const upcoming = appointments.filter((a) => a.status === "upcoming" && new Date(a.start_time).getTime() >= Date.now());
  const next = upcoming[0];

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Today's calls" value={todays.length} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Completed" value={appointments.filter((a) => a.status === "completed").length} />
        <Stat label="No-shows" value={appointments.filter((a) => a.status === "no_show").length} />
      </div>

      {next && (
        <div className="border border-blood/30 bg-blood/5 rounded-2xl p-6">
          <div className="text-eyebrow text-blood">Next upcoming call</div>
          <div className="mt-2 text-3xl font-display">{formatTime(next.start_time, tz)} — {next.client_name || next.client_email}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {formatDate(next.start_time, tz)} · {CALL_TYPE_LABEL[next.call_type] ?? next.call_type} · {next.duration_minutes} minutes
          </div>
          <button onClick={() => onSelect(next)} className="mt-4 btn-blood hover:btn-blood-hover">View details</button>
        </div>
      )}

      <div>
        <div className="text-eyebrow">Today</div>
        <div className="mt-3 space-y-2">
          {todays.length === 0 && <p className="text-sm text-muted-foreground">No calls scheduled today.</p>}
          {todays.map((a) => <CallRow key={a.id} a={a} tz={tz} onSelect={onSelect} />)}
        </div>
      </div>

      <div>
        <div className="text-eyebrow">Upcoming calls</div>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
          {upcoming.slice(0, 10).map((a) => <CallRow key={a.id} a={a} tz={tz} onSelect={onSelect} showDate />)}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-foreground/12 bg-card rounded-2xl px-5 py-4 shadow-sm">
      <div className="font-display text-3xl">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  );
}

export function CallRow({ a, tz, onSelect, showDate, showCoach }: { a: Appointment; tz: string; onSelect: (a: Appointment) => void; showDate?: boolean; showCoach?: boolean }) {
  return (
    <button
      onClick={() => onSelect(a)}
      className="w-full text-left border border-foreground/12 bg-card rounded-xl px-5 py-4 hover:border-blood/40 transition flex flex-wrap items-center gap-4 shadow-sm"
    >
      <div className="font-display text-xl w-32">{formatTime(a.start_time, tz)}</div>
      <div className="min-w-[180px]">
        <div className="font-semibold">{showCoach ? a.coach_name : (a.client_name || a.client_email || "Client")}</div>
        <div className="text-xs text-muted-foreground">
          {CALL_TYPE_LABEL[a.call_type] ?? a.call_type} · {a.duration_minutes} minutes{showDate ? ` · ${formatDate(a.start_time, tz)}` : ""}
        </div>
      </div>
      <div className="ml-auto"><StatusBadge status={a.status} /></div>
    </button>
  );
}

function CallsList({ appointments, tz, onSelect }: { appointments: Appointment[]; tz: string; onSelect: (a: Appointment) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const rows = useMemo(
    () => appointments.filter((a) => filter === "all" || a.status === filter),
    [appointments, filter],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {["all", "upcoming", "completed", "cancelled", "no_show"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.14em] rounded-full border ${filter === f ? "border-blood text-blood bg-blood/5" : "border-foreground/15 text-muted-foreground hover:bg-muted"}`}>
            {f.replace("_", "-")}
          </button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No calls here yet.</p>}
      <div className="space-y-2">{rows.map((a) => <CallRow key={a.id} a={a} tz={tz} onSelect={onSelect} showDate />)}</div>
    </div>
  );
}

function AvailabilityTab({ value, setValue, onSaved }: { value: Availability[]; setValue: (v: Availability[]) => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const save = useServerFn(saveMyAvailability);
  return (
    <AvailabilityEditor
      value={value}
      onChange={setValue}
      saving={saving}
      onSave={async () => {
        setSaving(true);
        try {
          await save({ data: { days: value } });
          toast.success("Availability saved.");
          onSaved();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}

function ProfileForm({ coach, onSaved }: { coach: Coach | null; onSaved: () => void }) {
  const save = useServerFn(saveMyCoachProfile);
  const [first, setFirst] = useState(coach?.first_name ?? "");
  const [last, setLast] = useState(coach?.last_name ?? "");
  const [phone, setPhone] = useState(coach?.phone ?? "");
  const [bio, setBio] = useState(coach?.bio ?? "");
  const [photo, setPhoto] = useState(coach?.profile_photo ?? "");
  const [specialty, setSpecialty] = useState(coach?.specialty ?? "fitness");
  const [tz, setTz] = useState(coach?.timezone ?? DEFAULT_TZ);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await save({ data: { first_name: first, last_name: last, phone, bio, specialty: specialty as "fitness", timezone: tz, profile_photo: photo || null } });
          toast.success(coach ? "Profile updated." : "Profile submitted — an admin will review it.");
          onSaved();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="First name" value={first} onChange={setFirst} required />
        <Field label="Last name" value={last} onChange={setLast} required />
      </div>
      <Field label="Phone" value={phone} onChange={setPhone} />
      <Field label="Profile photo URL" value={photo} onChange={setPhoto} />
      <div>
        <Label>Coaching specialty</Label>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value as typeof specialty)} className="w-full bg-background border border-foreground/20 rounded-xl px-4 py-3">
          {Object.entries(SPECIALTY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Timezone</Label>
        <select value={tz} onChange={(e) => setTz(e.target.value)} className="w-full bg-background border border-foreground/20 rounded-xl px-4 py-3">
          {TIMEZONES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
      </div>
      <div>
        <Label>Short bio</Label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full bg-background border border-foreground/20 rounded-xl px-4 py-3" />
      </div>
      <button disabled={busy} className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2">
        {busy && <Loader2 size={14} className="animate-spin" />} {coach ? "Save profile" : "Submit coach application"}
      </button>
    </form>
  );
}

function Notifications({ notifications, onRefresh, tz }: { notifications: AppNotification[]; onRefresh: () => void; tz: string }) {
  const markRead = useServerFn(markNotificationsRead);
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  return (
    <div className="space-y-4">
      {unreadIds.length > 0 && (
        <button
          onClick={async () => { await markRead({ data: { ids: unreadIds } }); onRefresh(); }}
          className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] border border-foreground/15 rounded-full hover:bg-muted"
        >
          <CheckCircle size={13} /> Mark all read
        </button>
      )}
      {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={`border rounded-xl px-5 py-4 ${n.read ? "border-foreground/10 bg-card" : "border-blood/30 bg-blood/5"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{n.title}</div>
              <div className="text-[11px] text-muted-foreground">{formatDate(n.created_at, tz)} {formatTime(n.created_at, tz)}</div>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{n.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{children}</label>;
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <Label>{label}{required && " *"}</Label>
      <input value={value} required={required} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-foreground/20 rounded-xl px-4 py-3" />
    </div>
  );
}
