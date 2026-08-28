import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Sunrise, Sun, Moon, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Slot = "morning" | "afternoon" | "evening";

export const SLOTS: { key: Slot; label: string; icon: typeof Sun }[] = [
  { key: "morning", label: "Morning", icon: Sunrise },
  { key: "afternoon", label: "Afternoon", icon: Sun },
  { key: "evening", label: "Evening", icon: Moon },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type TrackedStackItem = {
  id: string;
  name: string;
  dose: string | null;
  unit: string | null;
  frequency: string | null;
  schedule: string | null;
  active: boolean;
  time_slots: string[] | null;
  days_of_week: number[] | null;
};

type LogRow = { id: string; stack_id: string; dose_date: string; time_slot: string };

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Best-effort guess of dosing times + days from free-text frequency/schedule. */
export function inferSchedule(frequency: string, schedule: string): { slots: Slot[]; days: number[] } {
  const t = `${frequency} ${schedule}`.toLowerCase();
  const slots: Slot[] = [];
  if (/\bam\b|morning|wake|fasted|breakfast|pre-?workout/.test(t)) slots.push("morning");
  if (/afternoon|lunch|midday|mid-day|noon/.test(t)) slots.push("afternoon");
  if (/\bpm\b|evening|night|bed|before sleep|pre-?bed/.test(t)) slots.push("evening");

  const xDaily = t.match(/(\d)\s*x\s*(?:per\s*)?(?:a\s*)?day|(\d)\s*x\s*daily/);
  const count = xDaily ? Number(xDaily[1] ?? xDaily[2]) : 0;
  if (slots.length === 0) {
    if (count >= 3) slots.push("morning", "afternoon", "evening");
    else if (count === 2) slots.push("morning", "evening");
    else slots.push("morning");
  }

  let days = [0, 1, 2, 3, 4, 5, 6];
  if (/mon\s*[-–—to]+\s*fri|weekday/.test(t)) days = [1, 2, 3, 4, 5];
  else if (/5\s*(?:days)?\s*on.*2\s*(?:days)?\s*off/.test(t)) days = [1, 2, 3, 4, 5];
  else if (/every other day|eod|alternate/.test(t)) days = [1, 3, 5];
  else if (/weekly|once a week|1x\s*(?:per\s*)?week/.test(t)) days = [1];
  else if (/twice a week|2x\s*(?:per\s*)?week/.test(t)) days = [1, 4];
  else if (/3x\s*(?:per\s*)?week|three times a week/.test(t)) days = [1, 3, 5];

  return { slots: [...new Set(slots)], days };
}

export default function DoseTracker({ items }: { items: TrackedStackItem[] }) {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<string>(dateKey(new Date()));
  const [log, setLog] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() - base.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const loadLog = useCallback(async () => {
    if (!user || weekDays.length === 0) return;
    const from = dateKey(weekDays[0]!);
    const to = dateKey(weekDays[6]!);
    const { data, error } = await supabase
      .from("peptide_dose_log")
      .select("id, stack_id, dose_date, time_slot")
      .eq("user_id", user.id)
      .gte("dose_date", from)
      .lte("dose_date", to);
    if (error) { toast.error(error.message); return; }
    setLog((data as LogRow[]) ?? []);
  }, [user, weekDays]);

  useEffect(() => { loadLog(); }, [loadLog]);

  // When browsing to another week, move the selected day into that week
  // (same weekday) so the detail panel never shows a date outside the fetched range.
  useEffect(() => {
    const keys = weekDays.map(dateKey);
    if (!keys.includes(selected)) {
      const targetDow = new Date(`${selected}T12:00:00`).getDay();
      const match = weekDays.find((d) => d.getDay() === targetDow) ?? weekDays[0]!;
      setSelected(dateKey(match));
    }
  }, [weekDays, selected]);

  const active = useMemo(() => items.filter((i) => i.active), [items]);

  function dueOn(item: TrackedStackItem, d: Date) {
    const days = item.days_of_week?.length ? item.days_of_week : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(d.getDay());
  }

  function slotsFor(item: TrackedStackItem): Slot[] {
    const s = (item.time_slots?.length ? item.time_slots : ["morning"]) as Slot[];
    return SLOTS.map((x) => x.key).filter((k) => s.includes(k));
  }

  function dosesForDate(dk: string) {
    const d = new Date(`${dk}T12:00:00`);
    const out: { item: TrackedStackItem; slot: Slot }[] = [];
    for (const item of active) {
      if (!dueOn(item, d)) continue;
      for (const slot of slotsFor(item)) out.push({ item, slot });
    }
    return out;
  }

  const isDone = (stackId: string, dk: string, slot: Slot) =>
    log.some((l) => l.stack_id === stackId && l.dose_date === dk && l.time_slot === slot);

  async function toggle(stackId: string, dk: string, slot: Slot) {
    if (!user) return;
    const key = `${stackId}-${dk}-${slot}`;
    setBusy(key);
    const existing = log.find((l) => l.stack_id === stackId && l.dose_date === dk && l.time_slot === slot);
    if (existing) {
      const { error } = await supabase.from("peptide_dose_log").delete().eq("id", existing.id);
      setBusy(null);
      if (error) { toast.error(error.message); return; }
      setLog((p) => p.filter((l) => l.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from("peptide_dose_log")
        .insert({ user_id: user.id, stack_id: stackId, dose_date: dk, time_slot: slot })
        .select("id, stack_id, dose_date, time_slot")
        .single();
      setBusy(null);
      if (error) {
        // Unique-constraint race (already logged): just refresh instead of erroring.
        if (error.code === "23505") { await loadLog(); return; }
        toast.error(error.message);
        return;
      }
      setLog((p) => [...p, data as LogRow]);
    }
  }

  const today = dateKey(new Date());
  const selectedDoses = dosesForDate(selected);
  const doneCount = selectedDoses.filter((d) => isDone(d.item.id, selected, d.slot)).length;

  if (active.length === 0) {
    return (
      <div className="border border-dashed border-foreground/20 p-6 text-center text-sm text-muted-foreground">
        Add an active peptide below and it lands on this tracker automatically.
      </div>
    );
  }

  return (
    <div className="border border-foreground/15 bg-foreground/[0.02]">
      {/* Week strip */}
      <div className="flex items-center justify-between gap-2 border-b border-foreground/10 p-3">
        <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Previous week">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5 text-eyebrow">
          <CalendarDays size={13} className="text-blood" />
          {weekDays[0]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
          {weekDays[6]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </div>
        <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Next week">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-foreground/10">
        {weekDays.map((d) => {
          const dk = dateKey(d);
          const doses = dosesForDate(dk);
          const done = doses.filter((x) => isDone(x.item.id, dk, x.slot)).length;
          const isSel = dk === selected;
          return (
            <button
              key={dk}
              onClick={() => setSelected(dk)}
              className={`flex flex-col items-center gap-1 py-2 text-center transition ${isSel ? "bg-blood/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">{DAY_LABELS[d.getDay()]}</span>
              <span className={`font-display text-base ${dk === today ? "text-blood" : ""}`}>{d.getDate()}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {doses.length === 0 ? (
                  <span className="h-1 w-1 rounded-full bg-foreground/15" />
                ) : (
                  <span className={`h-1.5 w-1.5 rounded-full ${done === doses.length ? "bg-blood" : "bg-foreground/30"}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day */}
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-lg">
            {selected === today ? "Today" : new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {doneCount}/{selectedDoses.length} done
          </div>
        </div>

        {selectedDoses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled — rest day.</p>
        ) : (
          SLOTS.map(({ key, label, icon: Icon }) => {
            const rows = selectedDoses.filter((d) => d.slot === key);
            if (rows.length === 0) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-1.5 text-eyebrow"><Icon size={13} className="text-blood" /> {label}</div>
                <ul className="mt-2 divide-y divide-foreground/10 border border-foreground/10">
                  {rows.map(({ item }) => {
                    const done = isDone(item.id, selected, key);
                    const k = `${item.id}-${selected}-${key}`;
                    return (
                      <li key={k} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.dose ? `${item.dose} ${item.unit ?? ""}`.trim() : "No dose set"}
                            {item.frequency ? ` · ${item.frequency}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => toggle(item.id, selected, key)}
                          disabled={busy === k}
                          aria-label={done ? "Mark as not taken" : "Mark as taken"}
                          className={`shrink-0 flex h-8 w-8 items-center justify-center border transition ${done ? "border-blood bg-blood text-background" : "border-foreground/25 text-muted-foreground hover:border-blood hover:text-blood"}`}
                        >
                          <Check size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
