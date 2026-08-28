import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, TrendingDown, TrendingUp } from "lucide-react";

type Entry = {
  id: string;
  weight: number | null;
  body_fat: number | null;
  notes: string | null;
  created_at: string;
};

export default function ProgressTracker() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("progress_updates")
      .select("id, weight, body_fat, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(90);
    if (error) toast.error(error.message);
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const w = weight.trim() ? Number.parseFloat(weight) : null;
    const bf = bodyFat.trim() ? Number.parseFloat(bodyFat) : null;
    if (w === null && bf === null && !notes.trim()) {
      toast.error("Enter a weight, body fat %, or note first.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      toast.error("Please sign in again.");
      return;
    }
    const { error } = await supabase.from("progress_updates").insert({
      user_id: userData.user.id,
      weight: w,
      body_fat: bf,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Progress logged.");
    setWeight("");
    setBodyFat("");
    setNotes("");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("progress_updates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void load();
  };

  // Weight chart over time (oldest → newest).
  const chart = useMemo(() => {
    const pts = entries
      .filter((e) => e.weight !== null)
      .slice()
      .reverse()
      .map((e) => ({ w: e.weight as number, d: new Date(e.created_at) }));
    if (pts.length < 2) return null;
    const min = Math.min(...pts.map((p) => p.w));
    const max = Math.max(...pts.map((p) => p.w));
    const span = max - min || 1;
    const W = 600;
    const H = 160;
    const pad = 10;
    const coords = pts.map((p, i) => {
      const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
      const y = H - pad - ((p.w - min) / span) * (H - pad * 2);
      return `${x},${y}`;
    });
    const first = pts[0].w;
    const last = pts[pts.length - 1].w;
    return { line: coords.join(" "), min, max, change: last - first, W, H };
  }, [entries]);

  if (loading) return <div className="text-eyebrow">Loading progress…</div>;

  return (
    <div>
      <div className="text-eyebrow">Progress Tracker</div>
      <h2 className="mt-3 font-display text-3xl lg:text-4xl">Document the change.</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl">
        Log your weight and body fat over time. Your history is saved and charted automatically.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mt-8 max-w-2xl">
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Weight (lbs)"
          inputMode="decimal"
          className="stack-input"
        />
        <input
          value={bodyFat}
          onChange={(e) => setBodyFat(e.target.value)}
          placeholder="Body fat %"
          inputMode="decimal"
          className="stack-input"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          className="stack-input"
        />
      </div>
      <button onClick={() => void save()} disabled={saving} className="btn-blood hover:btn-blood-hover mt-4 flex items-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />} Log entry
      </button>

      {chart && (
        <div className="mt-10 border border-foreground/15 p-4 sm:p-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Weight trend</div>
            <div className={`flex items-center gap-1.5 font-mono text-xs ${chart.change <= 0 ? "text-emerald-500" : "text-blood"}`}>
              {chart.change <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {chart.change > 0 ? "+" : ""}
              {chart.change.toFixed(1)} lbs
            </div>
          </div>
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full mt-4">
            <polyline points={chart.line} fill="none" stroke="currentColor" strokeWidth="2" className="text-blood" />
          </svg>
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1">
            <span>{chart.max.toFixed(0)} lbs high</span>
            <span>{chart.min.toFixed(0)} lbs low</span>
          </div>
        </div>
      )}

      <div className="mt-10 space-y-2 max-w-2xl">
        {entries.length === 0 && (
          <div className="text-sm text-muted-foreground">No entries yet — log your first one above.</div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 border border-foreground/15 px-4 py-3">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {new Date(e.created_at).toLocaleDateString()}
              </div>
              <div className="text-sm mt-0.5">
                {e.weight !== null && <span className="font-semibold">{e.weight} lbs</span>}
                {e.body_fat !== null && <span className="ml-3 text-muted-foreground">{e.body_fat}% BF</span>}
                {e.notes && <span className="ml-3 text-muted-foreground truncate">{e.notes}</span>}
              </div>
            </div>
            <button onClick={() => void remove(e.id)} className="text-muted-foreground hover:text-blood transition" aria-label="Delete entry">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
