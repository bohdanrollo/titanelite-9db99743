import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FileText, Droplets, LogOut, Download, Beaker, Package, FlaskConical } from "lucide-react";
import { getProtocolDownloadUrl } from "@/lib/protocols.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Client Dashboard — Titan Elite" }] }),
  component: Dashboard,
});

type Tab = "protocols" | "peptides" | "supplies" | "reconstitution";

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
            { k: "supplies", l: "Supplies", i: Droplets },
            { k: "reconstitution", l: "Reconstitution", i: FlaskConical },
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
          {tab === "supplies" && <Supplies />}
          {tab === "reconstitution" && <Reconstitution />}
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
        <h3 className="font-display text-3xl">Top 50 Research Peptides</h3>
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


function Supplies() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-3xl">Research Supplies</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The basics you need to handle peptides safely and accurately in a research setting.
          </p>
        </div>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <Droplets size={18} className="text-blood" />
            <h4 className="font-display text-xl">BAC Water</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Bacteriostatic water is the standard diluent used to reconstitute lyophilized peptide powders. It contains 0.9% benzyl alcohol to inhibit bacterial growth and keep reconstituted solutions stable for research use.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <Package size={18} className="text-blood" />
            <h4 className="font-display text-xl">1mL Insulin Syringes</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            U-100 1mL insulin syringes let you measure small doses precisely. The fine needle minimizes tissue trauma and is suitable for research administration protocols requiring accuracy down to the unit mark.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <Package size={18} className="text-blood" />
            <h4 className="font-display text-xl">Alcohol Wipes</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Use alcohol prep pads to sterilize the rubber stopper of every vial before drawing and to clean the research site before administration. This is the simplest way to reduce contamination risk.
          </p>
        </article>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-3xl">Storage Guide</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Proper storage preserves peptide potency and protects your research supply.
          </p>
        </div>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Before Reconstitution</div>
          <h4 className="font-display text-xl mb-2">Lyophilized (Powder) Form</h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Keep vials sealed in their original packaging until use.</li>
            <li>Store in a refrigerator at 2–8°C (36–46°F).</li>
            <li>Protect from direct light, heat, and moisture.</li>
            <li>Avoid repeated temperature swings; a stable cold environment extends shelf life.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">After Reconstitution</div>
          <h4 className="font-display text-xl mb-2">Reconstituted Solution</h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Reconstitute with BAC water and refrigerate immediately at 2–8°C (36–46°F).</li>
            <li>Use within 30 days for best stability in research conditions.</li>
            <li>Do not freeze reconstituted peptides; ice crystals can degrade the compound.</li>
            <li>Keep vials away from direct light and heat sources.</li>
            <li>Swab the vial stopper with an alcohol wipe before each draw.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
function Reconstitution() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-3xl">Reconstitution</h3>
          <p className="text-sm text-muted-foreground mt-2">
            How to mix lyophilized peptide powder with bacteriostatic (BAC) water for research use.
          </p>
        </div>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 1 — Prepare</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Wash your hands thoroughly.</li>
            <li>Clean the work surface and lay out the vial, BAC water, syringe, and alcohol wipes.</li>
            <li>Let the peptide vial reach room temperature before reconstituting.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 2 — Add BAC Water</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Wipe the rubber stopper of the peptide vial with an alcohol wipe.</li>
            <li>Draw the desired amount of BAC water into the syringe.</li>
            <li>Slowly inject the BAC water down the inside wall of the vial — not directly onto the powder.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 3 — Dissolve Gently</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Roll the vial slowly between your hands until the powder is completely dissolved.</li>
            <li className="text-blood font-medium">DO NOT SHAKE the vials — shaking can damage the peptide structure.</li>
            <li>Do not stir or agitate the solution.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 4 — Store</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Refrigerate immediately after reconstitution at 2–8°C (36–46°F).</li>
            <li>Use within 30 days for best research stability.</li>
            <li>Keep away from light, heat, and freezing temperatures.</li>
          </ul>
        </article>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-3xl">Important Tips</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Small habits make a big difference in peptide stability and accuracy.
          </p>
        </div>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-blood" />
            <h4 className="font-display text-xl">Be Patient</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Some peptides dissolve slowly. Gentle rolling over a few minutes is better than any forceful mixing.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-blood" />
            <h4 className="font-display text-xl">Use the Right Water</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Only use bacteriostatic water for reconstitution. Standard sterile water lacks the preservative needed for multi-use research vials.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-blood" />
            <h4 className="font-display text-xl">Don't Freeze After Mixing</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Freezing a reconstituted solution can degrade the peptide. Keep it refrigerated and stable until use.
          </p>
        </article>
      </div>
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
