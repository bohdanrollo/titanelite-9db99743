import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { FileText, MessageSquare, Activity, LogOut, Upload, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Client Dashboard — Titan Elite" }] }),
  component: Dashboard,
});

type Tab = "protocols" | "messages" | "progress";

function Dashboard() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("protocols");
  const [intake, setIntake] = useState<{ id: string; status: string; submitted_at: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("intakes").select("id, status, submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setIntake(data));
  }, [user]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-foreground/10">
        <div className="container-edge h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-blood" />
            <span className="font-display text-xl tracking-wider">TITAN ELITE</span>
          </Link>
          <button onClick={signOut} className="font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:text-blood">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>
      <section className="container-edge py-12">
        <div className="text-eyebrow">Client Dashboard</div>
        <h1 className="mt-4 text-5xl lg:text-6xl">Welcome back.</h1>

        {!intake && (
          <div className="mt-8 border border-blood/40 bg-blood/5 p-6">
            <div className="font-display text-2xl">Your intake isn't submitted yet.</div>
            <p className="text-sm text-muted-foreground mt-2">Submit your intake to begin protocol review.</p>
            <Link to="/intake" className="mt-4 inline-flex btn-blood hover:btn-blood-hover">Begin Intake</Link>
          </div>
        )}
        {intake && (
          <div className="mt-8 flex flex-wrap items-center gap-6 border-y border-foreground/10 py-4 text-sm">
            <div><span className="text-eyebrow block">Status</span><span className="font-display text-xl">{intake.status}</span></div>
            <div><span className="text-eyebrow block">Submitted</span><span className="font-display text-xl">{new Date(intake.submitted_at).toLocaleDateString()}</span></div>
          </div>
        )}

        <nav className="mt-10 flex gap-1 border-b border-foreground/15">
          {([
            { k: "protocols", l: "Protocols", i: FileText },
            { k: "messages", l: "Messages", i: MessageSquare },
            { k: "progress", l: "Progress", i: Activity },
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
          {tab === "protocols" && <Protocols />}
          {tab === "messages" && <Messages />}
          {tab === "progress" && <Progress />}
        </div>
      </section>
    </div>
  );
}

function Protocols() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; type: string; title: string; content: string | null; file_url: string | null; coach_notes: string | null; created_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("protocols").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, [user]);

  async function markViewed(id: string) {
    await supabase.from("protocols").update({ viewed_at: new Date().toISOString() }).eq("id", id);
  }

  if (!items.length) return <Empty title="No protocols yet" body="Once your coach uploads your custom protocols, they'll appear here." />;

  return (
    <div className="space-y-4">
      {items.map((p) => (
        <article key={p.id} className="border border-foreground/10 p-6 hover:border-blood transition">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-eyebrow">{p.type}</div>
              <h3 className="font-display text-2xl mt-1">{p.title}</h3>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.14em] mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            {p.file_url && (
              <a href={p.file_url} target="_blank" rel="noreferrer" onClick={() => markViewed(p.id)} className="btn-blood hover:btn-blood-hover">
                <Download size={14} /> Download
              </a>
            )}
          </div>
          {p.content && <div className="mt-4 text-sm whitespace-pre-wrap text-muted-foreground">{p.content}</div>}
          {p.coach_notes && (
            <div className="mt-4 border-l-2 border-blood pl-4 text-sm bg-muted p-3">
              <div className="text-eyebrow mb-1">Coach Notes</div>
              {p.coach_notes}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Messages() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<{ id: string; sender_id: string; body: string; created_at: string }[]>([]);
  const [admin, setAdmin] = useState<string | null>(null);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle().then(({ data }) => setAdmin(data?.user_id ?? null));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
    function load() {
      supabase.from("messages").select("*").or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`).order("created_at", { ascending: true }).then(({ data }) => setMsgs(data ?? []));
    }
  }, [user]);

  async function send() {
    if (!body.trim() || !admin || !user) return;
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: admin, body });
    if (error) return toast.error(error.message);
    setBody("");
    const { data } = await supabase.from("messages").select("*").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: true });
    setMsgs(data ?? []);
  }

  if (!admin) return <Empty title="Messaging unavailable" body="No coach is assigned to your account yet." />;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 border border-foreground/10 h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.length === 0 && <div className="text-sm text-muted-foreground text-center mt-12">Start the conversation with your coach.</div>}
          {msgs.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto bg-blood text-primary-foreground" : "bg-muted"} p-3`}>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                <div className={`text-[10px] font-mono uppercase tracking-wider mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-foreground/10 p-3 flex gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" className="flex-1 bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
          <button onClick={send} className="btn-blood hover:btn-blood-hover">Send</button>
        </div>
      </div>
      <div className="border border-foreground/10 p-5 text-sm">
        <div className="text-eyebrow">About Messaging</div>
        <p className="mt-3 text-muted-foreground">Replies within 24 hours on business days. For urgent medical concerns, contact a licensed provider.</p>
      </div>
    </div>
  );
}

function Progress() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<{ id: string; weight: number | null; body_fat: number | null; notes: string | null; photo_url: string | null; created_at: string }[]>([]);
  const [weight, setWeight] = useState(""); const [bf, setBf] = useState(""); const [notes, setNotes] = useState(""); const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => { if (user) load(); }, [user]);
  async function load() {
    const { data } = await supabase.from("progress_updates").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setUpdates(data ?? []);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let url: string | null = null;
    if (photo) {
      const path = `${user!.id}/progress/${Date.now()}-${photo.name}`;
      const { error } = await supabase.storage.from("client-uploads").upload(path, photo);
      if (error) return toast.error(error.message);
      url = path;
    }
    const { error } = await supabase.from("progress_updates").insert({
      user_id: user!.id,
      weight: weight ? parseFloat(weight) : null,
      body_fat: bf ? parseFloat(bf) : null,
      notes: notes || null,
      photo_url: url,
    });
    if (error) return toast.error(error.message);
    toast.success("Progress logged.");
    setWeight(""); setBf(""); setNotes(""); setPhoto(null);
    load();
  }
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <form onSubmit={submit} className="space-y-4 border border-foreground/10 p-6 h-fit">
        <h3 className="font-display text-2xl">Log Update</h3>
        <Mini label="Weight (lbs)" value={weight} onChange={setWeight} type="number" />
        <Mini label="Body Fat %" value={bf} onChange={setBf} type="number" />
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">Notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">Photo (optional)</label>
          <label className="border-2 border-dashed border-foreground/20 p-3 flex items-center justify-center gap-2 cursor-pointer hover:border-blood text-sm">
            <Upload size={14} /> {photo ? photo.name : "Choose file"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <button className="btn-blood hover:btn-blood-hover w-full">Save</button>
      </form>
      <div className="lg:col-span-2 space-y-3">
        {updates.length === 0 && <Empty title="No updates yet" body="Log weight, body fat, notes and photos over time to track progress." />}
        {updates.map((u) => (
          <div key={u.id} className="border border-foreground/10 p-4 grid sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-eyebrow">Date</div><div>{new Date(u.created_at).toLocaleDateString()}</div></div>
            <div><div className="text-eyebrow">Weight</div><div>{u.weight ?? "—"}</div></div>
            <div><div className="text-eyebrow">Body Fat</div><div>{u.body_fat ?? "—"}</div></div>
            <div><div className="text-eyebrow">Notes</div><div className="text-muted-foreground">{u.notes ?? "—"}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
    </div>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-foreground/20 p-12 text-center">
      <div className="font-display text-3xl">{title}</div>
      <p className="text-sm text-muted-foreground mt-2">{body}</p>
    </div>
  );
}
