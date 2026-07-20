import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Dumbbell, FlaskConical, FileText, ChevronDown, MessageCircle, Beaker, ListChecks, Droplets, Syringe, Calculator } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroImg from "@/assets/titan-logo.jpg.asset.json";
import transform1 from "@/assets/transform-1.jpg.asset.json";
import transform2 from "@/assets/transform-2.jpg.asset.json";
import transform3 from "@/assets/transform-3.jpg.asset.json";
import transform4 from "@/assets/transform-4.jpg.asset.json";
import transform5 from "@/assets/transform-5.jpg.asset.json";
import transform6 from "@/assets/transform-6.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Elite — Engineered Physique Coaching" },
      { name: "description", content: "Premium 1:1 weightlifting programming and peptide education. No templates. Invest in yourself and engineer the body you train for." },
      { property: "og:title", content: "Titan Elite — Engineered Physique Coaching" },
      { property: "og:description", content: "Premium 1:1 weightlifting programming and peptide education. No templates. Invest in yourself and engineer the body you train for." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "/" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <Marquee />
      <Process />
      <DashboardFeatures />
      <Showcase />
      <Testimonials />

      <FAQPreview />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-foreground/10">
      <div className="container-edge grid lg:grid-cols-12 gap-10 pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="text-eyebrow">YOUR COMPLETE RESEARCH DASHBOARD</div>
          <h1 className="mt-6 text-6xl sm:text-7xl lg:text-[8.5rem] leading-[0.85]">
            Everything<br />
            <span className="text-blood">for peptides</span><br />
            & training.
          </h1>
          <p className="mt-8 max-w-xl text-base text-muted-foreground leading-relaxed">
            Track your stack, calculate doses, ask AI peptide questions, browse the 50-compound research library,
            and get step-by-step injection, reconstitution, and lifting guidance — all inside one client dashboard.
            No guesswork. No scattered tabs. Just the tools you need to research and train with precision.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/intake" className="btn-blood hover:btn-blood-hover">
              Get Dashboard Access <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="btn-ghost hover:bg-foreground hover:text-background">
              See Dashboard Tools
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
            {[
              { n: "50+", l: "Peptides catalogued" },
              { n: "AI", l: "Pep Talk assistant" },
              { n: "9", l: "Dashboard tools" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-3xl">{s.n}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 relative">
          <div className="relative overflow-hidden">
            <img src={heroImg.url} alt="Titan Elite logo" className="w-full h-auto block" width={1600} height={1200} />
            <div className="absolute inset-0 bg-gradient-to-tr from-ink/70 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="text-bone font-mono text-[10px] uppercase tracking-[0.2em]">File 037 / Deadlift, 4×3 @ 90%</div>
              <div className="h-px w-12 bg-blood" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Hypertrophy", "Strength", "Recomposition", "Peptide Education", "Bloodwork Review", "Programming", "Accountability"];
  return (
    <div className="bg-ink text-bone overflow-hidden border-y border-foreground/20">
      <div className="flex gap-12 py-5 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="font-display text-2xl tracking-wider flex items-center gap-12">
            {t} <span className="h-1.5 w-1.5 bg-blood inline-block rounded-full" />
          </span>
        ))}
      </div>
      <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}

function Process() {
  const steps = [
    { n: "01", t: "Apply", d: "Submit your detailed intake — training, health, goals, and peptide interests." },
    { n: "02", t: "Review", d: "Our team personally analyzes every form and drafts your custom protocol plan." },
    { n: "03", t: "Build", d: "You receive a custom weightlifting protocol and educational peptide protocol as a PDF." },
    { n: "04", t: "Train", d: "Weekly check-ins, programming adjustments, and unlimited access to the dashboard tools." },
  ];
  return (
    <section id="process" className="container-edge py-24 lg:py-32">
      <div className="grid lg:grid-cols-12 gap-12 items-end mb-16">
        <div className="lg:col-span-7">
          <div className="text-eyebrow">The Process</div>
          <h2 className="mt-4 text-5xl lg:text-7xl">Four steps. <br />No guesswork.</h2>
        </div>
        <p className="lg:col-span-5 text-muted-foreground">
          Coaching is a system, not a vibe. Every client moves through the same disciplined
          intake, review, and delivery flow — the protocol is what's custom.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/15">
        {steps.map((s) => (
          <div key={s.n} className="bg-background p-8 group hover:bg-ink hover:text-bone transition">
            <div className="font-mono text-blood text-sm">{s.n}</div>
            <div className="font-display text-3xl mt-4">{s.t}</div>
            <p className="mt-3 text-sm text-muted-foreground group-hover:text-bone/70">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardFeatures() {
  const items = [
    { i: FileText, t: "Custom Protocols", d: "Your coach delivers personalized weightlifting and peptide protocols as downloadable PDFs." },
    { i: MessageCircle, t: "Pep Talk AI", d: "Ask anything about peptide effects, dosing, timing, stacking, and safety — instant research answers." },
    { i: Beaker, t: "Top 50 Peptides", d: "A searchable research library covering the most popular compounds and what each is studied for." },
    { i: ListChecks, t: "My Stack", d: "Track every peptide, dose, unit, frequency, schedule, and notes in your personal dosing log." },
    { i: Droplets, t: "Supplies Guide", d: "BAC water, insulin syringes, alcohol wipes, plus storage techniques before and after reconstitution." },
    { i: FlaskConical, t: "Reconstitution", d: "Step-by-step mixing instructions: roll the vial gently in your hands until the powder dissolves — never shake." },
    { i: Syringe, t: "Injection Guide", d: "Subcutaneous injection site diagrams, rotation advice, and sterile technique walkthroughs." },
    { i: Calculator, t: "Dose Calculator", d: "Input vial strength, desired dose, and BAC water to see the exact draw volume on a 1 mL syringe." },
    { i: Dumbbell, t: "Lifting & Nutrition", d: "Training splits, popular lifts, and caloric / macro targets tailored to bulking, cutting, or maintenance." },
  ];
  return (
    <section className="bg-ink text-bone py-24 lg:py-32 border-y border-foreground/15">
      <div className="container-edge">
        <div className="text-eyebrow">Client Dashboard</div>
        <h2 className="mt-4 text-5xl lg:text-7xl max-w-4xl">
          Everything you need. <span className="text-blood">One dashboard.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-bone/70 leading-relaxed">
          Whether you are researching peptides or dialing in your training, the Titan Elite dashboard
          is built to hold every answer, calculator, and reference you will use — no guesswork, no app switching.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {items.map((b) => (
            <div key={b.t} className="border border-bone/15 bg-ink/50 p-6 hover:border-blood/60 transition">
              <b.i className="text-blood" size={26} strokeWidth={1.2} />
              <div className="font-display text-2xl mt-5">{b.t}</div>
              <p className="text-bone/70 text-sm mt-2 leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section className="container-edge py-24 lg:py-32">
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 lg:sticky lg:top-24 self-start">
          <div className="text-eyebrow">Results / Documentation</div>
          <h2 className="mt-4 text-5xl lg:text-6xl">Document the work.</h2>
          <p className="mt-6 text-muted-foreground">
            Real before/after photos from past clients (representative imagery — your results
            will vary based on consistency, genetics, and adherence).
          </p>
          <Link to="/intake" className="mt-8 btn-blood hover:btn-blood-hover inline-flex">Apply now</Link>
        </div>
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[transform1.url, transform2.url, transform3.url, transform4.url, transform5.url, transform6.url].map((src, i) => (
            <div key={i} className="relative overflow-hidden aspect-[4/5]">
              <img src={src} alt={`Client transformation ${i + 1}`} loading="lazy" className="size-full object-cover hover:scale-105 transition duration-700" />
              <div className="absolute bottom-2 left-2 text-bone font-mono text-[9px] uppercase tracking-[0.2em] bg-ink/70 px-2 py-1">
                Client / {String(i + 1).padStart(3, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { q: "I've worked with three coaches before Titan. This is the first program that actually accounted for my injury history.", a: "Marcus R.", s: "Hypertrophy block, 16 weeks" },
    { q: "The peptide education alone was worth the price. I finally understand what I'm putting in my body and why.", a: "Daniel K.", s: "Education + programming" },
    { q: "Dropped 18 lb and added 40 lb to my squat. The check-ins keep you honest.", a: "Jess T.", s: "Recomp protocol, 12 weeks" },
  ];
  return (
    <section className="bg-background border-y border-foreground/10 py-24">
      <div className="container-edge">
        <div className="text-eyebrow">Field Reports</div>
        <h2 className="mt-4 text-5xl lg:text-6xl mb-12">From the roster.</h2>
        <div className="grid lg:grid-cols-3 gap-px bg-foreground/15">
          {t.map((x) => (
            <figure key={x.a} className="bg-background p-8">
              <div className="text-blood font-serif text-5xl leading-none">"</div>
              <blockquote className="mt-2 text-lg leading-relaxed">{x.q}</blockquote>
              <figcaption className="mt-6 pt-6 border-t border-foreground/10">
                <div className="font-display text-xl">{x.a}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{x.s}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}


function FAQPreview() {
  const qa = [
    { q: "Do you prescribe peptides?", a: "No. Titan Elite provides educational protocol templates only. We do not diagnose, treat, prescribe, or sell peptides. Always consult a licensed medical provider." },
    { q: "How custom is the programming?", a: "Every protocol is built from scratch around your intake — no recycled templates. Updates roll out as you progress." },
    { q: "Do I need gym access?", a: "Yes. A full barbell setup is strongly recommended. We can adapt to commercial gyms or well-equipped home setups." },
    { q: "How long is the commitment?", a: "Most clients commit to a minimum 12-week block to see meaningful change." },
  ];
  return (
    <section className="bg-background border-t border-foreground/10 py-24">
      <div className="container-edge grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4">
          <div className="text-eyebrow">FAQ</div>
          <h2 className="mt-4 text-5xl lg:text-6xl">Common questions.</h2>
          <Link to="/faq" className="mt-8 inline-flex btn-ghost hover:bg-foreground hover:text-background">All FAQs →</Link>
        </div>
        <div className="lg:col-span-8 divide-y divide-foreground/10">
          {qa.map((x) => (
            <details key={x.q} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display text-2xl">{x.q}</span>
                <ChevronDown className="text-blood group-open:rotate-180 transition" />
              </summary>
              <p className="mt-3 text-muted-foreground leading-relaxed">{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-blood text-primary-foreground">
      <div className="container-edge py-24 lg:py-32 text-center">
        <div className="text-bone/80 font-mono text-[11px] uppercase tracking-[0.18em]">Now accepting new clients</div>
        <h2 className="mt-6 text-6xl lg:text-8xl leading-[0.85]">
          Stop training.<br />Start engineering.
        </h2>
        <Link to="/intake" className="mt-10 inline-flex items-center gap-2 bg-ink text-bone font-mono uppercase tracking-[0.14em] text-xs font-bold px-8 py-4 hover:bg-bone hover:text-ink transition">
          Submit Intake <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
