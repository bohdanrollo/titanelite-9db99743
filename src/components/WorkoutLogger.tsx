import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Trophy, X } from "lucide-react";

type Exercise = { name: string; sets: string; reps: string; weight: string };

type Session = {
  id: string;
  workout_date: string;
  name: string;
  notes: string | null;
  exercises: Exercise[];
};

const EMPTY_EX: Exercise = { name: "", sets: "", reps: "", weight: "" };

export default function WorkoutLogger() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([{ ...EMPTY_EX }]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, workout_date, name, notes, exercises")
      .order("workout_date", { ascending: false })
      .limit(60);
    if (error) toast.error(error.message);
    setSessions((data as Session[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Personal records: heaviest weight logged per exercise name.
  const prs = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      for (const ex of s.exercises ?? []) {
        const w = Number.parseFloat(ex.weight);
        if (!ex.name || !Number.isFinite(w)) continue;
        const key = ex.name.trim().toLowerCase();
        if (w > (map.get(key) ?? 0)) map.set(key, w);
      }
    }
    return map;
  }, [sessions]);

  const updateEx = (i: number, patch: Partial<Exercise>) =>
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const save = async () => {
    const valid = exercises.filter((e) => e.name.trim());
    if (valid.length === 0) {
      toast.error("Add at least one exercise.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      toast.error("Please sign in again.");
      return;
    }
    const { error } = await supabase.from("workout_sessions").insert({
      user_id: userData.user.id,
      name: name.trim() || "Workout",
      notes: notes.trim() || null,
      exercises: valid,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Workout logged.");
    setFormOpen(false);
    setName("");
    setNotes("");
    setExercises([{ ...EMPTY_EX }]);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void load();
  };

  if (loading) return <div className="text-eyebrow">Loading workouts…</div>;

  const topPrs = [...prs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div>
      <div className="text-eyebrow">Workout Logger</div>
      <h2 className="mt-3 font-display text-3xl lg:text-4xl">Log it. Lift it. Beat it.</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl">
        Record exercises, sets, reps, and weight for every session. Your personal records are tracked automatically.
      </p>

      {topPrs.length > 0 && (
        <div className="mt-8 border border-foreground/15 p-5 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Trophy size={13} className="text-blood" /> Personal records
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
            {topPrs.map(([n, w]) => (
              <div key={n} className="text-sm">
                <span className="capitalize text-muted-foreground">{n}</span>{" "}
                <span className="font-semibold">{w} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!formOpen ? (
        <button onClick={() => setFormOpen(true)} className="btn-blood hover:btn-blood-hover mt-6 flex items-center gap-2">
          <Plus size={14} /> Log a workout
        </button>
      ) : (
        <div className="mt-6 border border-foreground/15 p-5 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">New workout</div>
            <button onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workout name — e.g. Push Day"
            className="stack-input mt-4 w-full"
          />
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[1fr_56px_64px_80px] gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground px-0.5">
              <span>Exercise</span><span>Sets</span><span>Reps</span><span>Weight</span>
            </div>
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-[1fr_56px_64px_80px] gap-2 items-center">
                <input value={ex.name} onChange={(e) => updateEx(i, { name: e.target.value })} placeholder="Bench press" className="stack-input" />
                <input value={ex.sets} onChange={(e) => updateEx(i, { sets: e.target.value })} placeholder="4" inputMode="numeric" className="stack-input" />
                <input value={ex.reps} onChange={(e) => updateEx(i, { reps: e.target.value })} placeholder="8" inputMode="numeric" className="stack-input" />
                <input value={ex.weight} onChange={(e) => updateEx(i, { weight: e.target.value })} placeholder="185" inputMode="decimal" className="stack-input" />
              </div>
            ))}
          </div>
          <button
            onClick={() => setExercises((p) => [...p, { ...EMPTY_EX }])}
            className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-blood hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Add exercise
          </button>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional) — how it felt, energy, etc."
            className="stack-input mt-4 w-full"
          />
          <button onClick={() => void save()} disabled={saving} className="btn-blood hover:btn-blood-hover mt-4 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Save workout
          </button>
        </div>
      )}

      <div className="mt-10 space-y-3 max-w-2xl">
        {sessions.length === 0 && !formOpen && (
          <div className="text-sm text-muted-foreground">No workouts logged yet — log your first session above.</div>
        )}
        {sessions.map((s) => (
          <div key={s.id} className="border border-foreground/15 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {new Date(`${s.workout_date}T12:00:00`).toLocaleDateString()}
                </span>
                <div className="font-display text-xl mt-0.5">{s.name}</div>
              </div>
              <button onClick={() => void remove(s.id)} className="text-muted-foreground hover:text-blood transition" aria-label="Delete workout">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {(s.exercises ?? []).map((ex, i) => {
                const isPr = ex.name && Number.parseFloat(ex.weight) >= (prs.get(ex.name.trim().toLowerCase()) ?? Infinity);
                return (
                  <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="text-foreground">{ex.name}</span>
                    {ex.sets && ex.reps && <span>— {ex.sets} × {ex.reps}</span>}
                    {ex.weight && <span>@ {ex.weight} lbs</span>}
                    {isPr && Number.parseFloat(ex.weight) > 0 && <Trophy size={12} className="text-blood" />}
                  </div>
                );
              })}
            </div>
            {s.notes && <div className="mt-2 text-sm text-muted-foreground italic">{s.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
