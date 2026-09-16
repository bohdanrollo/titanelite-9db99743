import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Beaker,
  Bot,
  Check,
  ChevronRight,
  Dumbbell,
  FlaskConical,
  Layers3,
  Syringe,
  Utensils,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

import protocolImg from "@/assets/protocol.jpg";
import phoneImg from "@/assets/peplog-phone-stack-cutout.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PepLog — Peptide & Performance Tracking" },
      { name: "description", content: "Personalized protocols, peptide research, dose tracking, lab analysis, nutrition, training, and coaching in one private performance log." },
      { property: "og:title", content: "PepLog — Peptide & Performance Tracking" },
      { property: "og:description", content: "Track the protocol. Read the signals. Build measurable progress in one private performance platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const platformTools = [
  { icon: FlaskConical, title: "Lab Analysis", body: "Upload blood panels and turn complex markers into a clearer, saved review." },
  { icon: Utensils, title: "Nutrition Log", body: "Track calories, macros, branded foods, daily targets, and progress history." },
  { icon: Syringe, title: "Dose Tools", body: "Calculate research doses and log morning, afternoon, and evening schedules." },
  { icon: Layers3, title: "My Stack", body: "Keep compounds, timing, dose schedules, and completion history organized." },
  { icon: Bot, title: "Pep Talk AI", body: "Ask peptide research questions and explore answers inside the platform." },
  { icon: Beaker, title: "Research Library", body: "Browse 60+ compounds with research notes, profiles, and citations." },
];

function Home() {
  return (
    <div className="landing-light min-h-dvh bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <SignalStrip />
        <Platform />
        <Method />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border px-0 pt-16 sm:pt-20">
      <div className="container-edge relative z-10 flex flex-col items-center text-center">
        <div className="status-chip"><span className="status-dot" /> Your performance record is live</div>
        <h1 className="mt-7 max-w-5xl font-landing text-5xl font-semibold leading-[1.02] sm:text-7xl lg:text-[5.75rem]">
          Track the protocol.<br /><span className="text-primary">Read the signals.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl">
          PepLog brings peptide research, custom protocols, training, nutrition, labs, and coaching into one precise performance record.
        </p>
        <div className="mt-8 flex w-full max-w-2xl flex-col justify-center gap-3 sm:flex-row">
          <Link to="/auth" className="landing-btn-primary">Get dashboard access <ArrowRight size={16} /></Link>
          <Link to="/features" className="landing-btn-secondary">Explore the tools</Link>
          <Link to="/pephub" className="landing-btn-secondary">Go to PepHub</Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Track, Learn, Implement · Built for consistent use · Educational research only</p>
        <div className="relative mt-14 w-full max-w-sm sm:max-w-md">
          <img
            src={phoneImg}
            alt="PepLog My Stack screen on a phone, showing a weekly dosing schedule with morning and evening injections"
            className="relative z-10 w-full"
            width={476}
            height={1015}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}


function SignalStrip() {
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="container-edge grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[["21", "Connected tools"], ["60+", "Research profiles"], ["1", "Private performance log"]].map(([value, label]) => (
          <div key={label} className="flex items-baseline justify-center gap-3 py-7"><strong className="text-2xl font-semibold text-primary">{value}</strong><span className="text-xs uppercase text-muted-foreground">{label}</span></div>
        ))}
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section className="border-b border-border py-20 sm:py-28">
      <div className="container-edge">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div><div className="landing-kicker">The system</div><h2 className="mt-5 font-landing text-4xl font-semibold leading-tight sm:text-6xl">Every signal.<br /><span className="text-muted-foreground">One record.</span></h2></div>
          <p className="max-w-2xl self-end text-base leading-relaxed text-muted-foreground sm:text-lg">The tools you use every day stay connected to the same plan, giving you a clearer view of what you are doing and what is changing.</p>
        </div>
        <div className="mt-14 grid border-l border-t border-border md:grid-cols-2 xl:grid-cols-3">
          {platformTools.map(({ icon: Icon, title, body }, index) => (
            <Link key={title} to="/features" className="group min-h-60 border-b border-r border-border p-7 transition-colors hover:bg-secondary/60 sm:p-9">
              <div className="flex items-start justify-between"><Icon size={21} className="text-primary" strokeWidth={1.7} /><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span></div>
              <h3 className="mt-14 font-landing text-2xl font-semibold normal-case leading-tight">{title}</h3><p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p><ArrowRight size={16} className="mt-6 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Method() {
  return (
    <section className="border-b border-border bg-secondary/30 py-20 sm:py-28">
        <div className="border border-border p-7 sm:p-12 lg:p-16">
          <div className="landing-kicker">Built around you</div><h2 className="mt-5 font-landing text-4xl font-semibold leading-tight sm:text-6xl">Data informs.<br />Coaching decides.</h2>
          <p className="mt-7 max-w-xl leading-relaxed text-muted-foreground">PepLog brings your goals, training history, body composition, health context, and research interests into a clear plan—not a generic download.</p>
          <div className="mt-9 divide-y divide-border border-y border-border">
            {["Your intake shapes the plan from day one.", "Track the work and review what changes.", "Keep coaching, scheduling, and updates in one place."].map((text) => <div key={text} className="flex gap-3 py-4 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-primary" />{text}</div>)}
          </div>
          <Link to="/how-it-works" className="landing-text-link mt-7">See how it works <ChevronRight size={15} /></Link>
        </div>

    </section>
  );
}

function Closing() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-36">
      <img src={protocolImg} alt="Research protocol materials arranged on a work surface" className="absolute inset-0 h-full w-full object-cover opacity-15 grayscale" width={1024} height={1024} loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_88%,transparent)_65%,var(--background)_100%)]" />
      <div className="container-edge relative z-10"><div className="landing-kicker">Keep a better record</div><h2 className="mt-5 max-w-4xl font-landing text-5xl font-semibold leading-tight sm:text-7xl">Less guesswork.<br /><span className="text-primary">More signal.</span></h2><p className="mt-7 max-w-xl leading-relaxed text-muted-foreground">Join PepLog for private dashboard access, connected performance tools, and a plan built around your goals.</p><Link to="/auth" className="landing-btn-primary mt-9">Get dashboard access <ArrowRight size={16} /></Link></div>
    </section>
  );
}