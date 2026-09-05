import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateKey, formatTime, zonedParts, CALL_TYPE_LABEL } from "@/lib/tz";
import type { Appointment } from "@/lib/coaching.functions";

type View = "day" | "week" | "month";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function typeClasses(a: Appointment) {
  if (a.status === "cancelled") return "bg-muted text-muted-foreground line-through border-foreground/15";
  if (a.status === "no_show") return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  if (a.status === "completed") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  return a.call_type === "peptide"
    ? "bg-blood/10 text-blood border-blood/30"
    : "bg-sky-500/10 text-sky-700 border-sky-500/30";
}

export function CalendarView({
  appointments,
  tz,
  onSelect,
  showCoach = false,
}: {
  appointments: Appointment[];
  tz: string;
  onSelect: (a: Appointment) => void;
  showCoach?: boolean;
}) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());

  const byDay = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    for (const a of appointments) (m[dateKey(new Date(a.start_time), tz)] ??= []).push(a);
    for (const k of Object.keys(m)) m[k]!.sort((x, y) => x.start_time.localeCompare(y.start_time));
    return m;
  }, [appointments, tz]);

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor, view]);

  const title = useMemo(() => {
    if (view === "month") return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "day") return cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const s = days[0]!, e = days[days.length - 1]!;
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }, [cursor, view, days]);

  function shift(dir: number) {
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  }

  const todayKey = dateKey(new Date(), tz);

  return (
    <div className="border border-foreground/12 bg-card rounded-2xl overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="p-2 hover:bg-muted rounded-lg" aria-label="Previous"><ChevronLeft size={16} /></button>
          <button onClick={() => shift(1)} className="p-2 hover:bg-muted rounded-lg" aria-label="Next"><ChevronRight size={16} /></button>
          <button onClick={() => setCursor(new Date())} className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.14em] border border-foreground/15 rounded-full hover:bg-muted">Today</button>
          <div className="ml-2 font-display text-lg">{title}</div>
        </div>
        <div className="flex gap-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.14em] rounded-full border transition ${view === v ? "border-blood text-blood bg-blood/5" : "border-foreground/15 text-muted-foreground hover:bg-muted"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7">
          {DOW.map((d) => (
            <div key={d} className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b border-foreground/10">{d}</div>
          ))}
          {days.map((d) => {
            const k = dateKey(d, tz);
            const items = byDay[k] ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            return (
              <div key={k} className={`min-h-[104px] border-b border-r border-foreground/8 p-1.5 ${inMonth ? "" : "bg-muted/40"}`}>
                <div className={`text-xs mb-1 ${k === todayKey ? "text-blood font-semibold" : "text-muted-foreground"}`}>{zonedParts(d, tz).day}</div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((a) => (
                    <button key={a.id} onClick={() => onSelect(a)} className={`w-full text-left border px-1.5 py-1 rounded text-[11px] truncate ${typeClasses(a)}`}>
                      {formatTime(a.start_time, tz)} {showCoach ? a.coach_name : a.client_name}
                    </button>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`grid ${view === "day" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-7"}`}>
          {days.map((d) => {
            const k = dateKey(d, tz);
            const items = byDay[k] ?? [];
            return (
              <div key={k} className="border-b sm:border-r border-foreground/8 min-h-[160px] p-2">
                <div className={`mb-2 font-mono text-[10px] uppercase tracking-[0.16em] ${k === todayKey ? "text-blood" : "text-muted-foreground"}`}>
                  {DOW[d.getDay()]} {zonedParts(d, tz).month}/{zonedParts(d, tz).day}
                </div>
                <div className="space-y-1.5">
                  {items.length === 0 && <div className="text-[11px] text-muted-foreground/60">—</div>}
                  {items.map((a) => (
                    <button key={a.id} onClick={() => onSelect(a)} className={`w-full text-left border px-2 py-1.5 rounded-lg text-[11px] ${typeClasses(a)}`}>
                      <div className="font-semibold">{formatTime(a.start_time, tz)} · {a.duration_minutes}m</div>
                      <div className="truncate">{showCoach ? a.coach_name : a.client_name}</div>
                      <div className="truncate opacity-70">{CALL_TYPE_LABEL[a.call_type] ?? a.call_type}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
