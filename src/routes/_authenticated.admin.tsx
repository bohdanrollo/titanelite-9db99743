import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LogOut, Users, Inbox, FileText, ArrowLeft, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Titan Elite" }] }),
  component: Admin,
});

type Tab = "clients" | "intakes" | "protocols";

function Admin() {
  const { user, role, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("clients");

  useEffect(() => {
    if (!loading && role && role !== "admin") nav({ to: "/dashboard" });
  }, [role, loading, nav]);

  if (loading || !user) return <div className="min-h-dvh bg-background flex items-center justify-center text-eyebrow">Loading…</div>;
  if (role !== "admin") {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-eyebrow">Restricted</div>
          <h1 className="mt-4 text-4xl">Admin access required.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account isn't assigned the admin role. To enable yourself as admin, run this in the Cloud SQL editor with your user id:
          </p>
          <pre className="mt-4 text-left text-xs bg-muted p-3 overflow-x-auto"><code>INSERT INTO public.user_roles (user_id, role) VALUES ('{user.id}', 'admin');</code></pre>
          <Link to="/dashboard" className="mt-6 inline-flex btn-ghost"><ArrowLeft size={14} /> Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-foreground/10 bg-ink text-bone">
        <div className="container-edge h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-blood" />
            <span className="font-display text-xl tracking-wider">TITAN ELITE / ADMIN</span>
          </Link>
          <button onClick={signOut} className="font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:text-blood">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>
      <section className="container-edge py-12">
        <div className="text-eyebrow">Admin Dashboard</div>
        <h1 className="mt-4 text-5xl lg:text-6xl">Roster.</h1>

        <nav className="mt-10 flex gap-1 border-b border-foreground/15">
          {([
            { k: "clients", l: "Clients", i: Users },
            { k: "intakes", l: "Intakes", i: Inbox },
            { k: "protocols", l: "Protocols", i: FileText },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 border-b-2 transition ${tab === t.k ? "border-blood text-blood" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <t.i size={14} /> {t.l}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {tab === "clients" && <Clients />}
          {tab === "intakes" && <Intakes />}
          {tab === "protocols" && <ProtocolsAdmin />}
        </div>
      </section>
    </div>
  );
}

function Clients() {
  const [rows, setRows] = useState<{ id: string; full_name: string | null; email: string | null; created_at: string }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  const filtered = rows.filter((r) => !q || `${r.full_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full pl-10 pr-4 py-3 bg-background border border-foreground/20 focus:outline-none focus:border-blood" />
      </div>
      <div className="border border-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-eyebrow">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Joined</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-foreground/10 hover:bg-muted/40">
                <td className="p-3 font-medium">{r.full_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{r.email}</td>
                <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type IntakeRow = {
  id: string; user_id: string; status: string; submitted_at: string;
  age: number | null; gender: string | null; weight: string | null; height: string | null;
  fitness_experience: string | null; current_program: string | null;
  current_supplements: string | null; current_medications: string | null;
  injury_history: string | null; health_conditions: string | null;
  weightlifting_goals: string | null; strength_goals: string | null;
  muscle_gain_goals: string | null; fat_loss_goals: string | null;
  peptide_experience: string | null; peptides_of_interest: string | null;
  lifestyle: string | null; sleep_habits: string | null; nutrition_habits: string | null;
};

function Intakes() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [open, setOpen] = useState<IntakeRow | null>(null);
  useEffect(() => {
    supabase.from("intakes").select("*").order("submitted_at", { ascending: false }).then(({ data }) => setRows((data as IntakeRow[]) ?? []));
  }, []);
  return (
    <div>
      <div className="border border-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-eyebrow">
            <tr><th className="p-3">Submitted</th><th className="p-3">Client ID</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-foreground/10 hover:bg-muted/40">
                <td className="p-3 font-mono text-xs">{new Date(r.submitted_at).toLocaleString()}</td>
                <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                <td className="p-3"><span className="text-eyebrow">{r.status}</span></td>
                <td className="p-3 text-right"><button onClick={() => setOpen(r)} className="text-blood font-mono text-xs uppercase tracking-[0.14em]">Review →</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No intakes submitted yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-background max-w-3xl w-full my-10 border border-foreground/20">
            <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
              <div>
                <div className="text-eyebrow">Intake</div>
                <h3 className="font-display text-3xl">Client {open.user_id.slice(0, 8)}…</h3>
              </div>
              <button onClick={() => setOpen(null)} className="font-mono text-xs uppercase">Close ✕</button>
            </div>
            <div className="p-6 grid sm:grid-cols-3 gap-4 text-sm">
              <Stat l="Age" v={open.age?.toString()} />
              <Stat l="Gender" v={open.gender} />
              <Stat l="Height" v={open.height} />
              <Stat l="Weight" v={open.weight} />
            </div>
            <div className="px-6 pb-6 space-y-4 text-sm">
              {[
                ["Fitness Experience", open.fitness_experience],
                ["Current Program", open.current_program],
                ["Supplements", open.current_supplements],
                ["Medications", open.current_medications],
                ["Injury History", open.injury_history],
                ["Health Conditions", open.health_conditions],
                ["Weightlifting Goals", open.weightlifting_goals],
                ["Strength Goals", open.strength_goals],
                ["Muscle Gain Goals", open.muscle_gain_goals],
                ["Fat Loss Goals", open.fat_loss_goals],
                ["Peptide Experience", open.peptide_experience],
                ["Peptides of Interest", open.peptides_of_interest],
                ["Lifestyle", open.lifestyle],
                ["Sleep Habits", open.sleep_habits],
                ["Nutrition Habits", open.nutrition_habits],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <div className="text-eyebrow">{l}</div>
                  <p className="mt-1 whitespace-pre-wrap">{(v as string) || <span className="text-muted-foreground">—</span>}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-foreground/10 p-6">
              <AssignProtocol userId={open.user_id} onDone={() => setOpen(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string | null | undefined }) {
  return (
    <div className="border border-foreground/10 p-3">
      <div className="text-eyebrow">{l}</div>
      <div className="font-display text-xl">{v || "—"}</div>
    </div>
  );
}

function AssignProtocol({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [type, setType] = useState<"weightlifting" | "peptide" | "nutrition" | "other">("weightlifting");
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const { error } = await supabase.from("protocols").insert({ user_id: userId, type, title, content, coach_notes: notes });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Protocol assigned.");
    onDone();
  }
  return (
    <div className="space-y-4">
      <div className="font-display text-2xl">Assign Protocol</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={type} onChange={(e) => setType(e.target.value as "weightlifting" | "peptide" | "nutrition" | "other")} className="bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood">
          <option value="weightlifting">Weightlifting</option>
          <option value="peptide">Peptide</option>
          <option value="nutrition">Nutrition</option>
          <option value="other">Other</option>
        </select>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
      </div>
      <textarea rows={5} placeholder="Protocol content (sets, reps, dosing windows, etc.)" value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
      <textarea rows={2} placeholder="Coach notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
      <button onClick={save} disabled={busy || !title} className="btn-blood hover:btn-blood-hover disabled:opacity-40">{busy ? "Saving…" : "Assign Protocol"}</button>
    </div>
  );
}

function ProtocolsAdmin() {
  const [rows, setRows] = useState<{ id: string; user_id: string; type: string; title: string; created_at: string; viewed_at: string | null }[]>([]);
  useEffect(() => {
    supabase.from("protocols").select("id, user_id, type, title, created_at, viewed_at").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="border border-foreground/10">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-eyebrow">
          <tr><th className="p-3">Created</th><th className="p-3">Client</th><th className="p-3">Type</th><th className="p-3">Title</th><th className="p-3">Viewed</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-foreground/10">
              <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
              <td className="p-3"><span className="text-eyebrow">{r.type}</span></td>
              <td className="p-3 font-medium">{r.title}</td>
              <td className="p-3 text-xs">{r.viewed_at ? new Date(r.viewed_at).toLocaleDateString() : <span className="text-muted-foreground">Not yet</span>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No protocols assigned yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
