import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Phone, Loader2, Trash2, CheckCircle, Clock, XCircle } from "lucide-react";
import { listMyCoachCalls, requestCoachCall, cancelMyCoachCall, type CoachCall } from "@/lib/coach-calls.functions";

const SLOTS: string[] = [];
for (let m = 8 * 60; m <= 19 * 60 + 30; m += 30) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  SLOTS.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
}

function label12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Next 6 weeks of weekdays that are at least 48 hours out. */
function availableDays(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const min = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const d = new Date(min);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 45 && out.length < 30; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    const wd = day.getDay();
    if (wd === 0 || wd === 6) continue;
    // Skip days where even the last slot is inside the 48-hour window.
    const last = new Date(day);
    last.setHours(19, 30, 0, 0);
    if (last.getTime() < min.getTime()) continue;
    out.push({
      value: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      label: day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
    });
  }
  return out;
}

function statusBadge(status: string) {
  const map: Record<string, { cls: string; icon: typeof Clock; text: string }> = {
    pending: { cls: "text-amber-600 border-amber-500/40 bg-amber-500/10", icon: Clock, text: "Awaiting approval" },
    approved: { cls: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10", icon: CheckCircle, text: "Confirmed" },
    declined: { cls: "text-blood border-blood/40 bg-blood/10", icon: XCircle, text: "Declined" },
    completed: { cls: "text-muted-foreground border-foreground/20 bg-muted", icon: CheckCircle, text: "Completed" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${s.cls}`}>
      <s.icon size={11} /> {s.text}
    </span>
  );
}

export default function CoachCalls() {
  const load = useServerFn(listMyCoachCalls);
  const submit = useServerFn(requestCoachCall);
  const cancel = useServerFn(cancelMyCoachCall);

  const [calls, setCalls] = useState<CoachCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<"fitness" | "peptides">("fitness");
  const days = useMemo(availableDays, []);
  const [day, setDay] = useState(days[0]?.value ?? "");
  const [time, setTime] = useState("08:00");
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await load({ data: {} as never });
      setCalls(res.calls);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { refresh(); }, [refresh]);

  const slotsForDay = useMemo(() => {
    const min = Date.now() + 48 * 60 * 60 * 1000;
    return SLOTS.filter((s) => {
      const [y, mo, dd] = day.split("-").map(Number);
      const [h, mi] = s.split(":").map(Number);
      return new Date(y, mo - 1, dd, h, mi).getTime() >= min;
    });
  }, [day]);

  useEffect(() => {
    if (slotsForDay.length && !slotsForDay.includes(time)) setTime(slotsForDay[0]);
  }, [slotsForDay, time]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!day) return;
    const [y, mo, dd] = day.split("-").map(Number);
    const [h, mi] = time.split(":").map(Number);
    const start = new Date(y, mo - 1, dd, h, mi, 0, 0);
    setBusy(true);
    try {
      await submit({
        data: {
          topic,
          startIso: start.toISOString(),
          localWeekday: start.getDay(),
          localMinutes: h * 60 + mi,
          notes,
        },
      });
      toast.success("Call request sent — you'll get a confirmation once it's approved.");
      setNotes("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-eyebrow">Loading…</div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="border border-foreground/15 p-6">
        <div className="flex items-center gap-2 text-blood"><Phone size={16} /><span className="text-eyebrow">Book a coach call</span></div>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl">Talk it through, 30 minutes.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Weekdays, 8:00 AM – 8:00 PM. Requests must be made at least 48 hours ahead. Times shown in your local time zone.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-eyebrow block">What do you want to cover?</label>
            <div className="mt-2 flex gap-2">
              {(["fitness", "peptides"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] border transition ${topic === t ? "border-blood bg-blood/10 text-blood" : "border-foreground/20 text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "fitness" ? "Fitness" : "Peptides"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-eyebrow block" htmlFor="call-day">Day</label>
              <select
                id="call-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="mt-2 w-full border border-foreground/20 bg-background px-3 py-2.5 text-sm"
              >
                {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-eyebrow block" htmlFor="call-time">Start time</label>
              <select
                id="call-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-2 w-full border border-foreground/20 bg-background px-3 py-2.5 text-sm"
              >
                {slotsForDay.map((s) => <option key={s} value={s}>{label12(s)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-eyebrow block" htmlFor="call-notes">Main talking points</label>
            <textarea
              id="call-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              placeholder="What do you want to get out of this call?"
              className="mt-2 w-full border border-foreground/20 bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <button disabled={busy || !day} className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} Request call
          </button>
        </form>
      </div>

      <div>
        <div className="text-eyebrow">Your calls</div>
        {calls.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No calls requested yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {calls.map((c) => {
              const when = new Date(c.approved_start ?? c.requested_start);
              return (
                <div key={c.id} className="border border-foreground/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-lg">
                        {when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.topic === "peptides" ? "Peptides" : "Fitness"} · {c.duration_minutes} min
                        {c.approved_start && c.approved_start !== c.requested_start ? " · time adjusted by coach" : ""}
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                  {c.notes && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{c.notes}</p>}
                  {c.admin_notes && <p className="mt-2 text-sm"><span className="text-eyebrow">Coach note</span><br />{c.admin_notes}</p>}
                  {(c.status === "pending" || c.status === "approved") && (
                    <button
                      onClick={async () => {
                        try { await cancel({ data: { id: c.id } }); toast.success("Call cancelled"); refresh(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Could not cancel"); }
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-blood"
                    >
                      <Trash2 size={12} /> Cancel
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
