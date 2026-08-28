import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Droplets, Loader2, Moon, Footprints } from "lucide-react";

type Log = {
  id: string;
  log_date: string;
  water_oz: number;
  sleep_hours: number;
  steps: number;
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WellnessTracker() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [water, setWater] = useState("");
  const [sleep, setSleep] = useState("");
  const [steps, setSteps] = useState("");

  const today = todayLocal();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("wellness_logs")
      .select("id, log_date, water_oz, sleep_hours, steps")
      .order("log_date", { ascending: false })
      .limit(14);
    if (error) toast.error(error.message);
    const rows = (data as Log[]) ?? [];
    setLogs(rows);
    const t = rows.find((r) => r.log_date === today);
    if (t) {
      setWater(t.water_oz ? String(t.water_oz) : "");
      setSleep(t.sleep_hours ? String(t.sleep_hours) : "");
      setSteps(t.steps ? String(t.steps) : "");
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      toast.error("Please sign in again.");
      return;
    }
    const { error } = await supabase.from("wellness_logs").upsert(
      {
        user_id: userData.user.id,
        log_date: today,
        water_oz: water.trim() ? Number.parseFloat(water) : 0,
        sleep_hours: sleep.trim() ? Number.parseFloat(sleep) : 0,
        steps: steps.trim() ? Number.parseInt(steps, 10) : 0,
      },
      { onConflict: "user_id,log_date" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Today's wellness saved.");
    void load();
  };

  if (loading) return <div className="text-eyebrow">Loading wellness…</div>;

  const cards = [
    { i: Droplets, l: "Water", v: water, set: setWater, unit: "oz", ph: "e.g. 96" },
    { i: Moon, l: "Sleep", v: sleep, set: setSleep, unit: "hrs", ph: "e.g. 7.5" },
    { i: Footprints, l: "Steps", v: steps, set: setSteps, unit: "steps", ph: "e.g. 8000" },
  ];

  return (
    <div>
      <div className="text-eyebrow">Wellness Tracker</div>
      <h2 className="mt-3 font-display text-3xl lg:text-4xl">Water. Sleep. Steps.</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl">
        The three habits that decide how you feel and recover. Log today — it saves per day and your past days stay in history.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-8 max-w-2xl">
        {cards.map((c) => (
          <div key={c.l} className="border border-foreground/15 p-5">
            <div className="flex items-center gap-2 text-blood">
              <c.i size={18} strokeWidth={1.5} />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.l}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <input
                value={c.v}
                onChange={(e) => c.set(e.target.value)}
                placeholder={c.ph}
                inputMode="numeric"
                className="stack-input w-full"
              />
              <span className="font-mono text-[10px] uppercase text-muted-foreground shrink-0">{c.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => void save()} disabled={saving} className="btn-blood hover:btn-blood-hover mt-4 flex items-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />} Save today
      </button>

      <div className="mt-10 max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Past days</div>
        <div className="space-y-2">
          {logs.filter((l) => l.log_date !== today).length === 0 && (
            <div className="text-sm text-muted-foreground">No history yet — past days will show up here.</div>
          )}
          {logs
            .filter((l) => l.log_date !== today)
            .map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 border border-foreground/15 px-4 py-3 text-sm">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {new Date(`${l.log_date}T12:00:00`).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5"><Droplets size={13} className="text-blood" /> {l.water_oz} oz</span>
                <span className="flex items-center gap-1.5"><Moon size={13} className="text-blood" /> {l.sleep_hours} hrs</span>
                <span className="flex items-center gap-1.5"><Footprints size={13} className="text-blood" /> {l.steps.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
