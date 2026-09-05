import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Phone, BarChart3, Search, Loader2, Plus, Wand2, X, Trash2,
} from "lucide-react";
import {
  adminListCoaches, adminUpdateCoach, adminSetCoachAvailability, adminListAppointments,
  adminSchedulingData, adminFindAvailableCoaches, adminScheduleCall, adminUpdateCall, adminDeleteCall,
  type Appointment, type Availability, type Coach,
} from "@/lib/coaching.functions";
import { AvailabilityEditor, normalizeAvailability } from "@/components/coaching/AvailabilityEditor";
import { CalendarView } from "@/components/coaching/CalendarView";
import { CallDetailModal, StatusBadge } from "@/components/coaching/CallDetail";
import {
  CALL_TYPE_LABEL, DAY_NAMES, DEFAULT_TZ, SPECIALTY_LABEL, TIMEZONES,
  dateKey, formatDate, formatDateTime, formatTime, prettyTime, slotOptions, zonedToUtc,
} from "@/lib/tz";

type AdminCoach = Coach & { availability: Availability[]; counts: Record<string, number> };
type Sub = "overview" | "coaches" | "availability" | "calendar" | "calls" | "reports";

export type SchedulePrefill = {
  clientId?: string;
  callType?: "fitness" | "peptide";
  startIso?: string;
  duration?: number;
  notes?: string;
  requestId?: string;
};

const DURATIONS = [15, 30, 45, 60, 90];
const TZ_KEY = "titan_admin_tz";

export default function CoachingAdmin({ prefill, onPrefillHandled }: { prefill?: SchedulePrefill | null; onPrefillHandled?: () => void } = {}) {
  const loadCoaches = useServerFn(adminListCoaches);
  const loadAppts = useServerFn(adminListAppointments);

  const [sub, setSub] = useState<Sub>("overview");
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [scheduling, setScheduling] = useState<{ coachId?: string; prefill?: SchedulePrefill } | null>(null);
  const [tz, setTz] = useState(() => (typeof window !== "undefined" && localStorage.getItem(TZ_KEY)) || DEFAULT_TZ);

  useEffect(() => {
    if (prefill) setScheduling({ prefill });
  }, [prefill]);


  const refresh = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([loadCoaches({ data: {} as never }), loadAppts({ data: {} as never })]);
      setCoaches(c.coaches as AdminCoach[]);
      setAppointments(a.appointments);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load coaching data");
    } finally {
      setLoading(false);
    }
  }, [loadCoaches, loadAppts]);

  useEffect(() => { refresh(); }, [refresh]);

  function changeTz(v: string) {
    setTz(v);
    try { localStorage.setItem(TZ_KEY, v); } catch { /* ignore */ }
  }

  if (loading) return <div className="py-10 text-sm text-muted-foreground flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading coaching system…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {([
            { k: "overview", l: "Overview", i: LayoutDashboard },
            { k: "coaches", l: "Coaches", i: Users },
            { k: "availability", l: "Coach availability", i: Clock },
            { k: "calendar", l: "Call calendar", i: CalendarDays },
            { k: "calls", l: "Scheduled calls", i: Phone },
            { k: "reports", l: "Reports", i: BarChart3 },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setSub(t.k as Sub)}
              className={`px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] rounded-full border inline-flex items-center gap-2 ${sub === t.k ? "border-blood text-blood bg-blood/5" : "border-foreground/15 text-muted-foreground hover:bg-muted"}`}
            >
              <t.i size={13} /> {t.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={tz} onChange={(e) => changeTz(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2 text-xs">
            {TIMEZONES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
          <button onClick={() => setScheduling({})} className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2"><Plus size={14} /> Schedule call</button>
        </div>
      </div>

      {sub === "overview" && <Overview coaches={coaches} appointments={appointments} tz={tz} onSelect={setSelected} />}
      {sub === "coaches" && <CoachTable coaches={coaches} tz={tz} onRefresh={refresh} onSchedule={(id) => setScheduling({ coachId: id })} />}
      {sub === "availability" && <AvailabilityAdmin coaches={coaches} onRefresh={refresh} />}
      {sub === "calendar" && <CalendarView appointments={appointments} tz={tz} onSelect={setSelected} showCoach />}
      {sub === "calls" && <CallsTable appointments={appointments} tz={tz} onSelect={setSelected} />}
      {sub === "reports" && <Reports coaches={coaches} appointments={appointments} tz={tz} />}

      {selected && (
        <CallDetailModal
          call={selected}
          tz={tz}
          onClose={() => setSelected(null)}
          onStatus={async (status) => {
            try {
              await adminUpdateCall({ data: { id: selected.id, status } });
              toast.success("Call updated.");
              setSelected(null);
              refresh();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
          }}
          extra={
            <div className="pt-3 border-t border-foreground/10 space-y-3">
              <RescheduleBox call={selected} coaches={coaches} tz={tz} onDone={() => { setSelected(null); refresh(); }} />
              <button
                onClick={async () => {
                  if (!confirm("Delete this call permanently?")) return;
                  await adminDeleteCall({ data: { id: selected.id } });
                  toast.success("Call deleted.");
                  setSelected(null);
                  refresh();
                }}
                className="inline-flex items-center gap-2 text-blood text-[11px] font-mono uppercase tracking-[0.14em] hover:underline"
              >
                <Trash2 size={13} /> Delete call
              </button>
            </div>
          }
        />
      )}

      {scheduling && (
        <SchedulerModal
          presetCoachId={scheduling.coachId}
          tz={tz}
          onClose={() => setScheduling(null)}
          onDone={() => { setScheduling(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ---------------- overview ---------------- */

function Overview({ coaches, appointments, tz, onSelect }: { coaches: AdminCoach[]; appointments: Appointment[]; tz: string; onSelect: (a: Appointment) => void }) {
  const today = dateKey(new Date(), tz);
  const todays = appointments.filter((a) => dateKey(new Date(a.start_time), tz) === today && a.status !== "cancelled");
  const upcoming = appointments.filter((a) => a.status === "upcoming" && new Date(a.start_time).getTime() >= Date.now());
  const approved = coaches.filter((c) => c.status === "approved");
  const utilization = approved.map((c) => ({
    name: `${c.first_name} ${c.last_name}`.trim() || c.email,
    upcoming: upcoming.filter((a) => a.coach_id === c.id).length,
    total: c.counts.total ?? 0,
  })).sort((a, b) => b.upcoming - a.upcoming);

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Today's calls" value={todays.length} />
        <Stat label="Upcoming calls" value={upcoming.length} />
        <Stat label="Approved coaches" value={approved.length} />
        <Stat label="Pending coaches" value={coaches.filter((c) => c.status === "pending").length} />
        <Stat label="Total coaches" value={coaches.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="text-eyebrow">Today's calls</div>
          <div className="mt-3 space-y-2">
            {todays.length === 0 && <p className="text-sm text-muted-foreground">Nothing on the books today.</p>}
            {todays.map((a) => (
              <button key={a.id} onClick={() => onSelect(a)} className="w-full text-left border border-foreground/12 bg-card rounded-xl px-4 py-3 hover:border-blood/40 flex items-center gap-3">
                <span className="font-display text-lg w-24">{formatTime(a.start_time, tz)}</span>
                <span className="text-sm">{a.client_name || a.client_email} · <span className="text-muted-foreground">{a.coach_name}</span></span>
                <span className="ml-auto"><StatusBadge status={a.status} /></span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-eyebrow">Coach utilization</div>
          <div className="mt-3 space-y-2">
            {utilization.length === 0 && <p className="text-sm text-muted-foreground">No approved coaches yet.</p>}
            {utilization.map((u) => (
              <div key={u.name} className="border border-foreground/12 bg-card rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                <span>{u.name}</span>
                <span className="ml-auto text-muted-foreground">{u.upcoming} upcoming · {u.total} total</span>
              </div>
            ))}
          </div>
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

/* ---------------- coaches table ---------------- */

function CoachTable({ coaches, tz, onRefresh, onSchedule }: { coaches: AdminCoach[]; tz: string; onRefresh: () => void; onSchedule: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [view, setView] = useState<AdminCoach | null>(null);

  const rows = coaches.filter((c) => {
    const hay = `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`.toLowerCase();
    return hay.includes(q.toLowerCase())
      && (status === "all" || c.status === status)
      && (specialty === "all" || c.specialty === specialty);
  });

  async function setStatusFor(id: string, s: string) {
    try {
      await adminUpdateCoach({ data: { id, status: s as "approved" } });
      toast.success(`Coach ${s}.`);
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Total" value={coaches.length} />
        <Stat label="Pending" value={coaches.filter((c) => c.status === "pending").length} />
        <Stat label="Approved" value={coaches.filter((c) => c.status === "approved").length} />
        <Stat label="Suspended" value={coaches.filter((c) => c.status === "suspended").length} />
        <Stat label="Fitness" value={coaches.filter((c) => c.specialty === "fitness").length} />
        <Stat label="Peptide" value={coaches.filter((c) => c.specialty === "peptide").length} />
        <Stat label="Hybrid" value={coaches.filter((c) => c.specialty === "hybrid").length} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coaches" className="pl-9 pr-4 py-2 bg-background border border-foreground/20 rounded-full text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2 text-sm">
          {["all", "pending", "approved", "suspended", "inactive"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2 text-sm">
          {["all", "fitness", "peptide", "hybrid"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-foreground/12 rounded-2xl bg-card">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b border-foreground/10">
              <th className="px-4 py-3">Coach</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Upcoming</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-foreground/8">
                <td className="px-4 py-3">{`${c.first_name} ${c.last_name}`.trim() || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                <td className="px-4 py-3">{SPECIALTY_LABEL[c.specialty]}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} kind="coach" /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{availabilitySummary(c.availability)}</td>
                <td className="px-4 py-3">{c.counts.upcoming ?? 0}</td>
                <td className="px-4 py-3">{c.counts.completed ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <MiniBtn onClick={() => setView(c)}>View</MiniBtn>
                    {c.status !== "approved" && <MiniBtn onClick={() => setStatusFor(c.id, "approved")}>Approve</MiniBtn>}
                    {c.status !== "suspended" && <MiniBtn onClick={() => setStatusFor(c.id, "suspended")}>Suspend</MiniBtn>}
                    {c.status !== "inactive" && <MiniBtn onClick={() => setStatusFor(c.id, "inactive")}>Deactivate</MiniBtn>}
                    {c.status === "approved" && <MiniBtn onClick={() => onSchedule(c.id)}>Schedule</MiniBtn>}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No coaches match.</td></tr>}
          </tbody>
        </table>
      </div>

      {view && <CoachModal coach={view} tz={tz} onClose={() => setView(null)} onSaved={() => { setView(null); onRefresh(); }} />}
    </div>
  );
}

function availabilitySummary(rows: Availability[]) {
  const on = rows.filter((r) => r.is_available);
  if (!on.length) return "None set";
  return on.map((r) => `${DAY_NAMES[r.day_of_week]?.slice(0, 3)} ${prettyTime(r.start_time.slice(0, 5))}–${prettyTime(r.end_time.slice(0, 5))}`).join(", ");
}

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] border border-foreground/15 rounded-full hover:bg-muted">
      {children}
    </button>
  );
}

function CoachModal({ coach, tz, onClose, onSaved }: { coach: AdminCoach; tz: string; onClose: () => void; onSaved: () => void }) {
  const [first, setFirst] = useState(coach.first_name);
  const [last, setLast] = useState(coach.last_name);
  const [phone, setPhone] = useState(coach.phone);
  const [specialty, setSpecialty] = useState(coach.specialty);
  const [coachTz, setCoachTz] = useState(coach.timezone);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-foreground/12 rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
          <div className="font-display text-2xl">Edit coach</div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" className="bg-background border border-foreground/20 rounded-xl px-3 py-2" />
            <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" className="bg-background border border-foreground/20 rounded-xl px-3 py-2" />
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2" />
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value as typeof specialty)} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2">
            {Object.entries(SPECIALTY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={coachTz} onChange={(e) => setCoachTz(e.target.value)} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2">
            {TIMEZONES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
          <p className="text-muted-foreground whitespace-pre-wrap">{coach.bio || "No bio."}</p>
          <div className="text-xs text-muted-foreground">Availability: {availabilitySummary(coach.availability)}</div>
          <div className="text-xs text-muted-foreground">Joined {formatDate(coach.created_at, tz)}</div>
        </div>
        <div className="px-6 py-4 border-t border-foreground/10">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await adminUpdateCoach({ data: { id: coach.id, first_name: first, last_name: last, phone, specialty, timezone: coachTz } });
                toast.success("Coach updated.");
                onSaved();
              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
            }}
            className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- availability admin ---------------- */

function AvailabilityAdmin({ coaches, onRefresh }: { coaches: AdminCoach[]; onRefresh: () => void }) {
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const current = coaches.find((c) => c.id === coachId);
  const [rows, setRows] = useState<Availability[]>(normalizeAvailability(current?.availability ?? []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(normalizeAvailability(coaches.find((c) => c.id === coachId)?.availability ?? []));
  }, [coachId, coaches]);

  if (!coaches.length) return <p className="text-sm text-muted-foreground">No coaches yet.</p>;

  return (
    <div className="space-y-5">
      <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-4 py-2 text-sm">
        {coaches.map((c) => <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`.trim() || c.email} — {SPECIALTY_LABEL[c.specialty]}</option>)}
      </select>
      <AvailabilityEditor
        value={rows}
        onChange={setRows}
        saving={saving}
        onSave={async () => {
          setSaving(true);
          try {
            await adminSetCoachAvailability({ data: { coachId, days: rows } });
            toast.success("Availability saved.");
            onRefresh();
          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
        }}
      />
    </div>
  );
}

/* ---------------- calls table ---------------- */

function CallsTable({ appointments, tz, onSelect }: { appointments: Appointment[]; tz: string; onSelect: (a: Appointment) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = appointments.filter((a) => {
    const hay = `${a.client_name ?? ""} ${a.client_email ?? ""} ${a.coach_name ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (status === "all" || a.status === status);
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client or coach" className="pl-9 pr-4 py-2 bg-background border border-foreground/20 rounded-full text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2 text-sm">
          {["all", "upcoming", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto border border-foreground/12 rounded-2xl bg-card">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b border-foreground/10">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Coach</th>
              <th className="px-4 py-3">Type</th><th className="px-4 py-3">Length</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-foreground/8">
                <td className="px-4 py-3">{formatDateTime(a.start_time, tz)}</td>
                <td className="px-4 py-3">{a.client_name || a.client_email}</td>
                <td className="px-4 py-3">{a.coach_name}</td>
                <td className="px-4 py-3">{CALL_TYPE_LABEL[a.call_type] ?? a.call_type}</td>
                <td className="px-4 py-3">{a.duration_minutes}m</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3"><MiniBtn onClick={() => onSelect(a)}>Open</MiniBtn></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No calls yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- reports ---------------- */

function Reports({ coaches, appointments, tz }: { coaches: AdminCoach[]; appointments: Appointment[]; tz: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [coachId, setCoachId] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = appointments.filter((a) => {
    const d = dateKey(new Date(a.start_time), tz);
    return (!from || d >= from) && (!to || d <= to)
      && (coachId === "all" || a.coach_id === coachId)
      && (specialty === "all" || a.specialty === specialty)
      && (status === "all" || a.status === status);
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 864e5).toISOString();

  const perCoach = coaches.map((c) => {
    const mine = rows.filter((a) => a.coach_id === c.id);
    return {
      name: `${c.first_name} ${c.last_name}`.trim() || c.email,
      total: mine.length,
      completed: mine.filter((a) => a.status === "completed").length,
      cancelled: mine.filter((a) => a.status === "cancelled").length,
      no_show: mine.filter((a) => a.status === "no_show").length,
    };
  }).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);

  const bySpecialty = ["fitness", "peptide", "hybrid"].map((s) => ({ s, n: rows.filter((a) => a.specialty === s).length }));
  const max = Math.max(1, ...perCoach.map((p) => p.total));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2" />
        <span className="text-muted-foreground">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2" />
        <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2">
          <option value="all">All coaches</option>
          {coaches.map((c) => <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`.trim() || c.email}</option>)}
        </select>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2">
          {["all", "fitness", "peptide", "hybrid"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-background border border-foreground/20 rounded-full px-3 py-2">
          {["all", "upcoming", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total calls" value={rows.length} />
        <Stat label="This week" value={appointments.filter((a) => a.start_time >= weekAgo).length} />
        <Stat label="This month" value={appointments.filter((a) => a.start_time >= monthAgo).length} />
        <Stat label="Completed" value={rows.filter((a) => a.status === "completed").length} />
        <Stat label="Cancelled" value={rows.filter((a) => a.status === "cancelled").length} />
        <Stat label="No-shows" value={rows.filter((a) => a.status === "no_show").length} />
      </div>

      <div>
        <div className="text-eyebrow">Coach performance</div>
        <div className="mt-3 space-y-2">
          {perCoach.length === 0 && <p className="text-sm text-muted-foreground">No calls in this range.</p>}
          {perCoach.map((p) => (
            <div key={p.name} className="border border-foreground/12 bg-card rounded-xl px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted-foreground">{p.total} calls · {p.completed} completed · {p.cancelled} cancelled · {p.no_show} no-shows</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blood" style={{ width: `${(p.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-eyebrow">Calls by specialty</div>
        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          {bySpecialty.map((b) => <Stat key={b.s} label={SPECIALTY_LABEL[b.s] ?? b.s} value={b.n} />)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- scheduler ---------------- */

function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SchedulerModal({ presetCoachId, tz, onClose, onDone }: { presetCoachId?: string; tz: string; onClose: () => void; onDone: () => void }) {
  const loadData = useServerFn(adminSchedulingData);
  const findCoaches = useServerFn(adminFindAvailableCoaches);
  const schedule = useServerFn(adminScheduleCall);

  const [clients, setClients] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientQ, setClientQ] = useState("");
  const [callType, setCallType] = useState<"fitness" | "peptide">("fitness");
  const [date, setDate] = useState(todayKeyLocal());
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [coachId, setCoachId] = useState(presetCoachId ?? "");
  const [eligible, setEligible] = useState<{ id: string; name: string; specialty: string; reason: string | null }[]>([]);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadData({ data: {} as never }).then((d) => setClients(d.clients)).catch(() => {});
  }, [loadData]);

  const startIso = useMemo(() => zonedToUtc(date, time, tz).toISOString(), [date, time, tz]);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await findCoaches({ data: { callType, startIso, duration } });
      setEligible(res.coaches);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Check failed"); } finally { setChecking(false); }
  }, [findCoaches, callType, startIso, duration]);

  useEffect(() => { check(); }, [check]);

  const filteredClients = clients.filter((c) =>
    `${c.full_name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(clientQ.toLowerCase()));

  const free = eligible.filter((c) => !c.reason);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-foreground/12 rounded-2xl w-full max-w-2xl shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
          <div className="font-display text-2xl">Schedule a call</div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm">
          <div>
            <Lbl>Client</Lbl>
            <input value={clientQ} onChange={(e) => setClientQ(e.target.value)} placeholder="Search clients" className="w-full mb-2 bg-background border border-foreground/20 rounded-xl px-3 py-2" />
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2">
              <option value="">Select a client…</option>
              {filteredClients.slice(0, 200).map((c) => <option key={c.id} value={c.id}>{c.full_name || "—"} · {c.email}</option>)}
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Call type</Lbl>
              <select value={callType} onChange={(e) => { setCallType(e.target.value as "fitness"); setCoachId(""); }} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2">
                <option value="fitness">Fitness Consultation</option>
                <option value="peptide">Peptide Consultation</option>
              </select>
            </div>
            <div>
              <Lbl>Date</Lbl>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2" />
            </div>
            <div>
              <Lbl>Start time ({tz.replace("_", " ")})</Lbl>
              <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2">
                {slotOptions().map((s) => <option key={s} value={s}>{prettyTime(s)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Lbl>Duration</Lbl>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)} className={`px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] rounded-full border ${duration === d ? "border-blood text-blood bg-blood/5" : "border-foreground/15 hover:bg-muted"}`}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Lbl>Eligible coaches</Lbl>
              <button type="button" onClick={() => { const f = free[0]; if (f) { setCoachId(f.id); toast.success(`Selected ${f.name}`); } else toast.error("No coach is free at that time."); }} className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-blood hover:underline">
                <Wand2 size={13} /> Find available coach
              </button>
            </div>
            {checking && <div className="text-muted-foreground flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Checking availability…</div>}
            {!checking && eligible.length === 0 && <p className="text-muted-foreground">No approved coaches match this call type yet.</p>}
            <div className="space-y-2 mt-2">
              {eligible.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={!!c.reason}
                  onClick={() => setCoachId(c.id)}
                  className={`w-full text-left border rounded-xl px-4 py-3 transition ${coachId === c.id ? "border-blood bg-blood/5" : "border-foreground/12"} ${c.reason ? "opacity-50 cursor-not-allowed" : "hover:border-blood/40"}`}
                >
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{SPECIALTY_LABEL[c.specialty]}</div>
                  {c.reason && <div className="text-xs text-blood mt-1">{c.reason}</div>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-background border border-foreground/20 rounded-xl px-3 py-2" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-foreground/10 flex items-center gap-3">
          <button
            disabled={busy}
            onClick={async () => {
              if (!clientId) return toast.error("Pick a client.");
              if (!coachId) return toast.error("Pick a coach.");
              setBusy(true);
              try {
                await schedule({ data: { coachId, clientId, callType, startIso, duration, notes } });
                toast.success("Call scheduled — the coach has been notified.");
                onDone();
              } catch (e) { toast.error(e instanceof Error ? e.message : "Could not schedule"); } finally { setBusy(false); }
            }}
            className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} Create call
          </button>
          <span className="text-xs text-muted-foreground">Availability and double-booking are re-checked on the server.</span>
        </div>
      </div>
    </div>
  );
}

function RescheduleBox({ call, coaches, tz, onDone }: { call: Appointment; coaches: AdminCoach[]; tz: string; onDone: () => void }) {
  const [date, setDate] = useState(dateKey(new Date(call.start_time), tz));
  const [time, setTime] = useState(() => {
    const t = formatTime(call.start_time, tz);
    const [hm, ap] = t.split(" ");
    const [h, m] = (hm ?? "0:0").split(":").map(Number);
    const hour = ap === "PM" && h !== 12 ? (h ?? 0) + 12 : ap === "AM" && h === 12 ? 0 : (h ?? 0);
    return `${String(hour).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
  });
  const [coachId, setCoachId] = useState(call.coach_id);
  const [duration, setDuration] = useState(call.duration_minutes);
  const [busy, setBusy] = useState(false);
  const eligible = coaches.filter((c) => c.status === "approved" && (c.specialty === "hybrid" || c.specialty === call.call_type));

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Reschedule / change coach</div>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background border border-foreground/20 rounded-lg px-2 py-1.5 text-sm" />
        <select value={time} onChange={(e) => setTime(e.target.value)} className="bg-background border border-foreground/20 rounded-lg px-2 py-1.5 text-sm">
          {slotOptions().map((s) => <option key={s} value={s}>{prettyTime(s)}</option>)}
        </select>
        <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="bg-background border border-foreground/20 rounded-lg px-2 py-1.5 text-sm">
          {eligible.map((c) => <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`.trim()}</option>)}
        </select>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-background border border-foreground/20 rounded-lg px-2 py-1.5 text-sm">
          {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
        </select>
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await adminUpdateCall({ data: { id: call.id, coachId, startIso: zonedToUtc(date, time, tz).toISOString(), duration } });
            toast.success("Call rescheduled — coach notified.");
            onDone();
          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
        }}
        className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] border border-foreground/15 rounded-full hover:bg-muted inline-flex items-center gap-2"
      >
        {busy && <Loader2 size={13} className="animate-spin" />} Save changes
      </button>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{children}</div>;
}
