import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FileText, Activity, LogOut, Upload, Download, Beaker } from "lucide-react";
import { getProtocolDownloadUrl } from "@/lib/protocols.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Client Dashboard — Titan Elite" }] }),
  component: Dashboard,
});

type Tab = "protocols" | "peptides" | "progress";

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
        <p className="mt-3 text-sm text-muted-foreground">
          Need peptides? Order through{" "}
          <a href="https://powerbuiltlabs.com/?ref=bjr" target="_blank" rel="noopener noreferrer" className="text-blood hover:underline">
            Powerbuilt Labs
          </a>{" "}
          and use code <span className="text-blood font-medium">BJR</span> to save.
        </p>

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
            { k: "peptides", l: "Peptides", i: Beaker },
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
          {tab === "peptides" && <Peptides />}
          {tab === "progress" && <Progress />}
        </div>
      </section>
    </div>
  );
}

function Protocols() {
  const { user } = useAuth();
  const downloadFn = useServerFn(getProtocolDownloadUrl);
  const [items, setItems] = useState<{ id: string; type: string; title: string; status: string; draft_content: unknown; pdf_storage_path: string | null; coach_notes: string | null; created_at: string; delivered_at: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("protocols")
      .select("id, type, title, status, draft_content, pdf_storage_path, coach_notes, created_at, delivered_at")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [user]);

  async function download(id: string) {
    try {
      const { url } = await downloadFn({ data: { protocolId: id } });
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  if (!items.length) return <Empty title="No protocols yet" body="Once your coach delivers your custom protocol, it'll appear here with a downloadable PDF." />;

  return (
    <div className="space-y-4">
      {items.map((p) => {
        const draft = p.draft_content as { overview?: string } | null;
        return (
          <article key={p.id} className="border border-foreground/10 p-6 hover:border-blood transition">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-eyebrow">{p.type}</div>
                <h3 className="font-display text-2xl mt-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.14em] mt-1">
                  Delivered {p.delivered_at ? new Date(p.delivered_at).toLocaleDateString() : "—"}
                </p>
              </div>
              {p.pdf_storage_path && (
                <button onClick={() => download(p.id)} className="btn-blood hover:btn-blood-hover">
                  <Download size={14} /> Download PDF
                </button>
              )}
            </div>
            {draft?.overview && <div className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{draft.overview}</div>}
            {p.coach_notes && (
              <div className="mt-4 border-l-2 border-blood pl-4 text-sm bg-muted p-3">
                <div className="text-eyebrow mb-1">Coach Notes</div>
                {p.coach_notes}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

const PEPTIDES: { name: string; researched: string }[] = [
  { name: "BPC-157", researched: "Researched for gut lining repair, tendon/ligament healing, and systemic anti-inflammatory effects." },
  { name: "TB-500 (Thymosin Beta-4)", researched: "Researched for soft-tissue recovery, muscle repair, and improved cellular migration." },
  { name: "CJC-1295 (with DAC)", researched: "Researched as a long-acting GHRH analog to elevate baseline growth hormone and IGF-1." },
  { name: "Ipamorelin", researched: "Researched as a selective GH secretagogue that boosts growth hormone without spiking cortisol or prolactin." },
  { name: "Sermorelin", researched: "Researched for stimulating natural GH release, sleep quality, and recovery." },
  { name: "Tesamorelin", researched: "Researched for reducing visceral adipose tissue and improving lipid metabolism." },
  { name: "MOTS-c", researched: "Researched for mitochondrial function, insulin sensitivity, and metabolic efficiency." },
  { name: "5-Amino-1MQ", researched: "Researched for NNMT inhibition, fat loss, and preservation of lean tissue." },
  { name: "GHK-Cu", researched: "Researched for skin regeneration, collagen synthesis, and hair follicle health." },
  { name: "Epithalon", researched: "Researched for telomerase activation, sleep-cycle regulation, and longevity markers." },
  { name: "Semaglutide", researched: "Researched as a GLP-1 agonist for appetite regulation, glucose control, and fat loss." },
  { name: "Tirzepatide", researched: "Researched as a dual GIP/GLP-1 agonist for weight management and metabolic health." },
  { name: "PT-141 (Bremelanotide)", researched: "Researched for libido and sexual response via melanocortin receptor activation." },
  { name: "Melanotan II", researched: "Researched for melanogenesis, UV protection, and appetite suppression." },
  { name: "Selank", researched: "Researched for anxiolytic effects, cognitive focus, and stress resilience." },
  { name: "Semax", researched: "Researched for cognitive enhancement, neuroprotection, and BDNF expression." },
  { name: "Dihexa", researched: "Researched for cognitive support, neurogenesis, and improved synaptic connectivity." },
  { name: "Pinealon", researched: "Researched for brain health, sleep regulation, and cellular differentiation." },
  { name: "Cerebrolysin", researched: "Researched for neuroprotection, recovery, and cognitive function support." },
  { name: "Thymalin", researched: "Researched for immune modulation, thymus function, and overall immune balance." },
  { name: "Thymosin Alpha-1", researched: "Researched for immune system modulation, antiviral response, and immune cell activity." },
  { name: "LL-37", researched: "Researched for antimicrobial activity, immune response, and tissue repair signaling." },
  { name: "KPV", researched: "Researched for anti-inflammatory effects, skin healing, and immune modulation." },
  { name: "VIP (Vasoactive Intestinal Peptide)", researched: "Researched for immune regulation, gut health, and respiratory support." },
  { name: "DSIP", researched: "Researched for sleep architecture, stress recovery, and endocrine balance." },
  { name: "AOD-9604", researched: "Researched for fat metabolism, lipolysis, and weight management without hunger modulation." },
  { name: "HGH Fragment 176-191", researched: "Researched for fat oxidation, lipolysis, and metabolic enhancement." },
  { name: "IGF-1 LR3", researched: "Researched for muscle cell growth, hypertrophy, and recovery signaling." },
  { name: "IGF-1 DES", researched: "Researched for localized tissue growth, muscle repair, and anabolic signaling." },
  { name: "PEG-MGF", researched: "Researched for muscle stem cell activation, recovery, and tissue regeneration." },
  { name: "MGF (Mechano Growth Factor)", researched: "Researched for muscle repair, hypertrophy, and training adaptation." },
  { name: "Follistatin 344", researched: "Researched for myostatin inhibition, muscle growth, and tissue development." },
  { name: "ACE-031", researched: "Researched for myostatin pathway inhibition and muscle mass support." },
  { name: "SARMs / S-23 (research context)", researched: "Researched for selective androgen receptor modulation and body composition." },
  { name: "SARMs / RAD-140 (research context)", researched: "Researched for neuroprotective and anabolic signaling properties." },
  { name: "SARMs / LGD-4033 (research context)", researched: "Researched for muscle preservation, strength, and lean tissue support." },
  { name: "Oxytocin", researched: "Researched for social bonding, stress response, and metabolic regulation." },
  { name: "Vasopressin", researched: "Researched for memory consolidation, circadian rhythm, and water balance." },
  { name: "Delta Sleep-Inducing Peptide (DSIP)", researched: "Researched for sleep quality, recovery, and stress hormone balance." },
  { name: "Melanotan I", researched: "Researched for tanning response, melanogenesis, and UV protection." },
  { name: "Hexarelin", researched: "Researched as a potent GH secretagogue for growth hormone release and cardiac protection." },
  { name: "GHRP-2", researched: "Researched for growth hormone release, appetite stimulation, and recovery." },
  { name: "GHRP-6", researched: "Researched for growth hormone release, appetite increase, and tissue repair." },
  { name: "Ipamorelin + CJC-1295 (combo)", researched: "Researched for synergistic GH release, recovery, and body composition." },
  { name: "Triptorelin", researched: "Researched for hormone modulation, testosterone regulation, and fertility contexts." },
  { name: " kisspeptin-10", researched: "Researched for reproductive hormone signaling, LH/FSH release, and fertility." },
  { name: "hCG (Human Chorionic Gonadotropin)", researched: "Researched for fertility support, hormone preservation, and testicular function." },
  { name: "Bremelanotide (PT-141)", researched: "Researched for sexual arousal, libido, and melanocortin receptor activation." },
  { name: "Albuterol (research context)", researched: "Researched for bronchodilation, fat oxidation, and metabolic performance." },
  { name: "Clenbuterol (research context)", researched: "Researched for beta-2 agonism, thermogenesis, and fat loss in animal models." },
  { name: "T3 / Liothyronine (research context)", researched: "Researched for thyroid hormone metabolism, energy expenditure, and fat oxidation." },
  { name: "T4 / Levothyroxine (research context)", researched: "Researched for thyroid replacement, metabolic rate, and hormone balance." },
];

function Peptides() {
  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-3xl">Top 15 Research Peptides</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Educational reference only. Compounds listed for research purposes — not medical advice. Order through{" "}
          <a href="https://powerbuiltlabs.com/?ref=bjr" target="_blank" rel="noopener noreferrer" className="text-blood hover:underline">Powerbuilt Labs</a>{" "}
          with code <span className="text-blood font-medium">BJR</span>.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {PEPTIDES.map((p, i) => (
          <article key={p.name} className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <h4 className="font-display text-xl">{p.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{p.researched}</p>
          </article>
        ))}
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
