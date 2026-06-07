import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Dumbbell, FlaskConical, FileText, Activity, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroImg from "@/assets/titan-logo.jpg.asset.json";
import handsImg from "@/assets/hands-bar.jpg";
import physiqueImg from "@/assets/physique.jpg";
import protocolImg from "@/assets/protocol.jpg";
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
      { name: "description", content: "Premium 1:1 weightlifting programming and educational peptide protocols. Apply for coaching." },
      { property: "og:title", content: "Titan Elite — Engineered Physique Coaching" },
      { property: "og:description", content: "Premium 1:1 weightlifting programming and educational peptide protocols." },
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
      <Benefits />
      <Showcase />
      <Testimonials />
      <PricingPreview />
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
          <div className="text-eyebrow">INVEST IN YOURSELF</div>
          <h1 className="mt-6 text-6xl sm:text-7xl lg:text-[8.5rem] leading-[0.85]">
            Engineer<br />
            <span className="text-blood">the body</span><br />
            you train for.
          </h1>
          <p className="mt-8 max-w-xl text-base text-muted-foreground leading-relaxed">
            1:1 weightlifting programming and educational peptide protocols, built around
            your goals, your training history, and your physiology. No templates. No filler.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/intake" className="btn-blood hover:btn-blood-hover">
              Begin Intake <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="btn-ghost hover:bg-foreground hover:text-background">
              See Services
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
            {[
              { n: "10+", l: "Years coaching" },
              { n: "150+", l: "Clients served" },
              { n: "100%", l: "Custom protocols" },
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
    { n: "02", t: "Review", d: "Our team personally analyzes every form. We confirm fit and select your package." },
    { n: "03", t: "Build", d: "You receive a custom weightlifting protocol and educational peptide protocol." },
    { n: "04", t: "Train", d: "Weekly check-ins, programming adjustments, and direct messaging access." },
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

function Benefits() {
  const items = [
    { i: Dumbbell, t: "Custom Programming", d: "Periodized blocks built around your lifts, recovery and schedule." },
    { i: FlaskConical, t: "Peptide Education", d: "Evidence-informed peptide protocol templates — strictly educational." },
    { i: FileText, t: "Delivered as PDF", d: "Clean, printable documents you can take to the gym or your provider." },
    { i: Activity, t: "Real Accountability", d: "Direct messaging, weekly check-ins, and progress tracking inside your dashboard." },
  ];
  return (
    <section className="bg-ink text-bone py-24 lg:py-32 border-y border-foreground/15">
      <div className="container-edge">
        <div className="text-eyebrow">Why Titan Elite</div>
        <h2 className="mt-4 text-5xl lg:text-7xl max-w-3xl">Built for clients who are done <span className="text-blood">winging it.</span></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          {items.map((b) => (
            <div key={b.t} className="border-t border-bone/20 pt-6">
              <b.i className="text-blood" size={28} strokeWidth={1.2} />
              <div className="font-display text-2xl mt-6">{b.t}</div>
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
    { q: "Dropped 18 lb and added 40 lb to my squat. The check-ins keep you honest.", a: "Jess T.", s: "Recomp protocol, 20 weeks" },
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

function PricingPreview() {
  const tiers = [
    { n: "Foundation", p: "$59", per: "one-time", b: ["Custom training block (4 weeks)", "Educational peptide notes", "Email support"] },
    { n: "Elite", p: "$199", per: "/ month", h: true, b: ["Full custom training programming", "Custom peptide protocol", "Weekly check-ins", "Direct messaging"] },
    { n: "Apex", p: "$399", per: "/ month", b: ["Monthly programming reset", "Bloodwork review", "Bi-weekly video call", "Priority access"] },
  ];
  return (
    <section className="container-edge py-24 lg:py-32">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
        <div>
          <div className="text-eyebrow">Investment</div>
          <h2 className="mt-4 text-5xl lg:text-6xl">Pick your tier.</h2>
        </div>
        <Link to="/pricing" className="btn-ghost hover:bg-foreground hover:text-background">Full pricing →</Link>
      </div>
      <div className="grid md:grid-cols-3 gap-px bg-foreground/15">
        {tiers.map((t) => (
          <div key={t.n} className={`p-8 ${t.h ? "bg-ink text-bone" : "bg-background"}`}>
            {t.h && <div className="text-blood font-mono text-[10px] uppercase tracking-[0.18em] mb-4">Most Selected</div>}
            <div className="font-display text-3xl">{t.n}</div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl">{t.p}</span>
              <span className="font-mono text-xs uppercase tracking-wider opacity-60">{t.per}</span>
            </div>
            <ul className="mt-8 space-y-3 text-sm">
              {t.b.map((x) => (
                <li key={x} className="flex gap-2"><Check size={16} className="text-blood shrink-0 mt-0.5" /><span>{x}</span></li>
              ))}
            </ul>
            <Link to="/intake" className={`mt-8 inline-flex ${t.h ? "btn-blood hover:btn-blood-hover" : "btn-ghost hover:bg-foreground hover:text-background"}`}>
              Apply
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQPreview() {
  const qa = [
    { q: "Do you prescribe peptides?", a: "No. Titan Elite provides educational protocol templates only. We do not diagnose, treat, prescribe, or sell peptides. Always consult a licensed medical provider." },
    { q: "How custom is the programming?", a: "Every protocol is built from scratch around your intake — no recycled templates. Updates roll out as you progress." },
    { q: "Do I need gym access?", a: "Yes. A full barbell setup is strongly recommended. We can adapt to commercial gyms or well-equipped home setups." },
    { q: "How long is the commitment?", a: "Most clients commit to a minimum 12-week block to see meaningful change. Monthly billing, cancel anytime after the initial block." },
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
