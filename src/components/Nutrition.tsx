import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Search, Trash2, Target, CalendarDays, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { searchFoods, type FoodResult } from "@/lib/nutrition.functions";

type Entry = {
  id: string;
  log_date: string;
  name: string;
  brand: string | null;
  serving: string | null;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type Goals = { calorie_goal: number; protein_pct: number; carbs_pct: number; fat_pct: number };

const DEFAULT_GOALS: Goals = { calorie_goal: 2000, protein_pct: 30, carbs_pct: 40, fat_pct: 30 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function macroTargets(g: Goals) {
  return {
    protein: Math.round((g.calorie_goal * g.protein_pct) / 100 / 4),
    carbs: Math.round((g.calorie_goal * g.carbs_pct) / 100 / 4),
    fat: Math.round((g.calorie_goal * g.fat_pct) / 100 / 9),
  };
}

function sum(entries: Entry[]) {
  return entries.reduce(
    (a, e) => ({
      calories: a.calories + Number(e.calories) * Number(e.quantity),
      protein: a.protein + Number(e.protein_g) * Number(e.quantity),
      carbs: a.carbs + Number(e.carbs_g) * Number(e.quantity),
      fat: a.fat + Number(e.fat_g) * Number(e.quantity),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export default function Nutrition() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [goalDraft, setGoalDraft] = useState<string>("2000");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"today" | "past">("today");
  const [openDay, setOpenDay] = useState<string | null>(null);

  const today = todayStr();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: g }, { data: e }] = await Promise.all([
      supabase.from("nutrition_goals").select("calorie_goal, protein_pct, carbs_pct, fat_pct").eq("user_id", user.id).maybeSingle(),
      supabase.from("food_log_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    ]);
    if (g) {
      setGoals(g as Goals);
      setGoalDraft(String((g as Goals).calorie_goal));
    }
    setEntries((e ?? []) as Entry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const todayEntries = useMemo(() => entries.filter((e) => e.log_date === today), [entries, today]);
  const pastDays = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      if (e.log_date === today) continue;
      const arr = map.get(e.log_date) ?? [];
      arr.push(e);
      map.set(e.log_date, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries, today]);

  const totals = sum(todayEntries);
  const targets = macroTargets(goals);

  async function saveGoal() {
    if (!user) return;
    const val = Math.max(500, Math.min(10000, Number.parseInt(goalDraft, 10) || 0));
    const next = { ...goals, calorie_goal: val };
    const { error } = await supabase
      .from("nutrition_goals")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    setGoals(next);
    setGoalDraft(String(val));
    toast.success("Calorie goal saved");
  }

  async function saveSplit(next: Goals) {
    if (!user) return;
    const { error } = await supabase
      .from("nutrition_goals")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    setGoals(next);
  }

  async function addEntry(food: Omit<Entry, "id" | "log_date">) {
    if (!user) return;
    const { data, error } = await supabase
      .from("food_log_entries")
      .insert({ user_id: user.id, log_date: today, ...food })
      .select("*")
      .single();
    if (error) { toast.error(error.message); return; }
    setEntries((prev) => [...prev, data as Entry]);
    toast.success(`Added ${food.name}`);
  }

  async function removeEntry(id: string) {
    const { error } = await supabase.from("food_log_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" size={16} /> Loading your nutrition log…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-eyebrow">Nutrition</div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl">Calorie &amp; Macro Tracker</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Search foods and drinks by brand, log them to today, and your macros fill in automatically. Each new day
          starts fresh — every past day is saved in History.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(["today", "past"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] border ${view === v ? "border-blood text-blood bg-blood/5" : "border-foreground/15 text-muted-foreground hover:text-foreground"}`}
          >
            {v === "today" ? "Today" : "History"}
          </button>
        ))}
      </div>

      {view === "today" ? (
        <>
          {/* Goal */}
          <div className="border border-foreground/15 p-5">
            <div className="flex items-center gap-2 text-eyebrow"><Target size={13} className="text-blood" /> Daily Goal</div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Calories / day</label>
                <input
                  type="number"
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  className="mt-1 w-32 border border-foreground/15 bg-background px-3 py-2 text-sm"
                />
              </div>
              <button onClick={saveGoal} className="btn-blood hover:btn-blood-hover">Save goal</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 max-w-lg">
              {([["protein_pct", "Protein %"], ["carbs_pct", "Carbs %"], ["fat_pct", "Fat %"]] as const).map(([k, l]) => (
                <div key={k}>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{l}</label>
                  <input
                    type="number"
                    value={goals[k]}
                    onChange={(e) => setGoals({ ...goals, [k]: Number.parseInt(e.target.value, 10) || 0 })}
                    onBlur={() => saveSplit(goals)}
                    className="mt-1 w-full border border-foreground/15 bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Targets: {targets.protein}g protein · {targets.carbs}g carbs · {targets.fat}g fat
              {goals.protein_pct + goals.carbs_pct + goals.fat_pct !== 100 && (
                <span className="text-blood"> · split adds to {goals.protein_pct + goals.carbs_pct + goals.fat_pct}%</span>
              )}
            </p>
          </div>

          {/* Rings / bars */}
          <div className="grid sm:grid-cols-4 gap-4">
            <Stat label="Calories" value={Math.round(totals.calories)} target={goals.calorie_goal} unit="kcal" />
            <Stat label="Protein" value={Math.round(totals.protein)} target={targets.protein} unit="g" />
            <Stat label="Carbs" value={Math.round(totals.carbs)} target={targets.carbs} unit="g" />
            <Stat label="Fat" value={Math.round(totals.fat)} target={targets.fat} unit="g" />
          </div>

          <FoodSearch onAdd={addEntry} />

          <div>
            <div className="text-eyebrow">Today&apos;s Log · {new Date().toLocaleDateString()}</div>
            {todayEntries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing logged yet today.</p>
            ) : (
              <ul className="mt-3 divide-y divide-foreground/10 border border-foreground/15">
                {todayEntries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {e.name} {e.brand && <span className="text-muted-foreground">· {e.brand}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Number(e.quantity)} × {e.serving || "serving"} — {Math.round(Number(e.calories) * Number(e.quantity))} kcal ·{" "}
                        {Math.round(Number(e.protein_g) * Number(e.quantity))}p /{" "}
                        {Math.round(Number(e.carbs_g) * Number(e.quantity))}c /{" "}
                        {Math.round(Number(e.fat_g) * Number(e.quantity))}f
                      </div>
                    </div>
                    <button onClick={() => removeEntry(e.id)} className="shrink-0 text-muted-foreground hover:text-blood" aria-label="Remove">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-eyebrow"><CalendarDays size={13} className="text-blood" /> Past Days</div>
          {pastDays.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No past days saved yet.</p>
          ) : (
            <ul className="mt-3 border border-foreground/15 divide-y divide-foreground/10">
              {pastDays.map(([date, list]) => {
                const t = sum(list);
                const open = openDay === date;
                return (
                  <li key={date}>
                    <button onClick={() => setOpenDay(open ? null : date)} className="w-full text-left p-3 hover:bg-muted/50">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-lg">{new Date(`${date}T12:00:00`).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(t.calories)} kcal · {Math.round(t.protein)}p / {Math.round(t.carbs)}c / {Math.round(t.fat)}f
                          {" · "}goal {goals.calorie_goal}
                        </span>
                      </div>
                    </button>
                    {open && (
                      <ul className="bg-muted/30 px-3 pb-3 text-xs text-muted-foreground space-y-1">
                        {list.map((e) => (
                          <li key={e.id}>
                            {Number(e.quantity)} × {e.name}
                            {e.brand ? ` (${e.brand})` : ""} — {Math.round(Number(e.calories) * Number(e.quantity))} kcal
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="border border-foreground/15 p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">
        {value}
        <span className="text-sm text-muted-foreground"> / {target} {unit}</span>
      </div>
      <div className="mt-2 h-1.5 w-full bg-foreground/10">
        <div className="h-full bg-blood transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {target - value > 0 ? `${target - value} ${unit} left` : `${value - target} ${unit} over`}
      </div>
    </div>
  );
}

function FoodSearch({ onAdd }: { onAdd: (f: Omit<Entry, "id" | "log_date">) => Promise<void> }) {
  const run = useServerFn(searchFoods);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ name: "", brand: "", serving: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      const r = await run({ data: { query: q } });
      setResults(r);
      if (r.length === 0) toast.info("No foods matched — try a different name or add it manually.");
    } catch {
      toast.error("Food search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="border border-foreground/15 p-5">
      <div className="flex items-center gap-2 text-eyebrow"><Search size={13} className="text-blood" /> Add Food or Drink</div>
      <form onSubmit={doSearch} className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by brand or food — e.g. Chipotle chicken bowl, Fairlife protein shake"
          className="flex-1 border border-foreground/15 bg-background px-3 py-2 text-sm"
        />
        <button type="submit" disabled={searching} className="btn-blood hover:btn-blood-hover shrink-0">
          {searching ? <Loader2 className="animate-spin" size={14} /> : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="mt-4 max-h-96 overflow-y-auto divide-y divide-foreground/10 border border-foreground/10">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {r.name} {r.brand && <span className="text-muted-foreground">· {r.brand}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.serving} — {r.calories} kcal · {r.protein_g}p / {r.carbs_g}c / {r.fat_g}f
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={qty[r.id] ?? "1"}
                  onChange={(e) => setQty((p) => ({ ...p, [r.id]: e.target.value }))}
                  className="w-16 border border-foreground/15 bg-background px-2 py-1.5 text-sm"
                  aria-label="Servings"
                />
                <button
                  onClick={() =>
                    onAdd({
                      name: r.name,
                      brand: r.brand || null,
                      serving: r.serving,
                      quantity: Math.max(0.25, Number.parseFloat(qty[r.id] ?? "1") || 1),
                      calories: r.calories,
                      protein_g: r.protein_g,
                      carbs_g: r.carbs_g,
                      fat_g: r.fat_g,
                    })
                  }
                  className="border border-blood px-2.5 py-1.5 text-blood hover:bg-blood hover:text-background transition"
                  aria-label={`Add ${r.name}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setManual((v) => !v)} className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-blood flex items-center gap-1">
        {manual ? <X size={12} /> : <Plus size={12} />} {manual ? "Cancel manual entry" : "Add manually"}
      </button>

      {manual && (
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {([["name", "Food"], ["brand", "Brand"], ["serving", "Serving"], ["calories", "Calories"], ["protein_g", "Protein (g)"], ["carbs_g", "Carbs (g)"], ["fat_g", "Fat (g)"]] as const).map(([k, l]) => (
            <div key={k}>
              <label className="block text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{l}</label>
              <input
                value={m[k]}
                onChange={(e) => setM({ ...m, [k]: e.target.value })}
                className="mt-1 w-full border border-foreground/15 bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex items-end">
            <button
              onClick={async () => {
                if (!m.name.trim()) { toast.error("Give the food a name."); return; }
                await onAdd({
                  name: m.name.trim(),
                  brand: m.brand.trim() || null,
                  serving: m.serving.trim() || "1 serving",
                  quantity: 1,
                  calories: Number.parseFloat(m.calories) || 0,
                  protein_g: Number.parseFloat(m.protein_g) || 0,
                  carbs_g: Number.parseFloat(m.carbs_g) || 0,
                  fat_g: Number.parseFloat(m.fat_g) || 0,
                });
                setM({ name: "", brand: "", serving: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
              }}
              className="btn-blood hover:btn-blood-hover w-full"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
