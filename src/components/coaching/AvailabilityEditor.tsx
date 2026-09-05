import { useState } from "react";
import { Copy, Save, Loader2 } from "lucide-react";
import { DAY_NAMES, WEEKDAYS, prettyTime, slotOptions } from "@/lib/tz";
import type { Availability } from "@/lib/coaching.functions";

const SLOTS = slotOptions();

export function normalizeAvailability(rows: Availability[]): Availability[] {
  return WEEKDAYS.map((d) => {
    const found = rows.find((r) => r.day_of_week === d);
    return {
      day_of_week: d,
      is_available: found?.is_available ?? false,
      start_time: (found?.start_time ?? "08:00").slice(0, 5),
      end_time: (found?.end_time ?? "20:00").slice(0, 5),
    };
  });
}

export function AvailabilityEditor({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: Availability[];
  onChange: (v: Availability[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function patch(day: number, p: Partial<Availability>) {
    onChange(value.map((v) => (v.day_of_week === day ? { ...v, ...p } : v)));
  }

  function copyMonday() {
    const mon = value.find((v) => v.day_of_week === 1);
    if (!mon) return;
    onChange(value.map((v) => ({ ...v, is_available: mon.is_available, start_time: mon.start_time, end_time: mon.end_time })));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Weekdays only, 8:00 AM – 8:00 PM. Admins can only book inside these hours.</p>
        <button onClick={copyMonday} type="button" className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] border border-foreground/15 rounded-full hover:bg-muted">
          <Copy size={13} /> {copied ? "Copied" : "Copy Monday to all weekdays"}
        </button>
      </div>

      <div className="space-y-2">
        {value.map((row) => (
          <div key={row.day_of_week} className="flex flex-wrap items-center gap-3 border border-foreground/12 bg-card rounded-xl px-4 py-3">
            <div className="w-28 font-display text-lg">{DAY_NAMES[row.day_of_week]}</div>
            <label className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em]">
              <input
                type="checkbox"
                checked={row.is_available}
                onChange={(e) => patch(row.day_of_week, { is_available: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-blood,#c1121f)]"
              />
              {row.is_available ? "Available" : "Unavailable"}
            </label>
            <div className={`flex items-center gap-2 ml-auto ${row.is_available ? "" : "opacity-40 pointer-events-none"}`}>
              <select
                value={row.start_time}
                onChange={(e) => patch(row.day_of_week, { start_time: e.target.value })}
                className="bg-background border border-foreground/20 rounded-lg px-3 py-2 text-sm"
              >
                {SLOTS.slice(0, -1).map((s) => <option key={s} value={s}>{prettyTime(s)}</option>)}
              </select>
              <span className="text-muted-foreground text-sm">to</span>
              <select
                value={row.end_time}
                onChange={(e) => patch(row.day_of_week, { end_time: e.target.value })}
                className="bg-background border border-foreground/20 rounded-lg px-3 py-2 text-sm"
              >
                {SLOTS.slice(1).map((s) => <option key={s} value={s}>{prettyTime(s)}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onSave} disabled={saving} className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save availability
      </button>
    </div>
  );
}
