import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Beaker,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  Layers3,
  LineChart,
  Syringe,
  Utensils,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import handsBarImg from "@/assets/hands-bar.jpg";
import protocolImg from "@/assets/protocol.jpg";

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
    <div className="landing-dark min-h-dvh bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
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
      <div className="peplog-grid absolute inset-0" aria-hidden="true" />
      <div className="container-edge relative z-10 flex flex-col items-center text-center">
        <div className="status-chip"><span className="status-dot" /> Your performance record is live</div>
        <h1 className="mt-7 max-w-5xl font-landing text-5xl font-semibold leading-[1.02] sm:text-7xl lg:text-[5.75rem]">
          Track the protocol.<br /><span className="text-primary">Read the signals.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl">
          PepLog brings peptide research, custom protocols, training, nutrition, labs, and coaching into one precise performance record.
        </p>
        <div className="mt-8 flex w-full max-w-lg flex-col justify-center gap-3 sm:flex-row">
          <Link to="/auth" className="landing-btn-primary">Get dashboard access <ArrowRight size={16} /></Link>
          <Link to="/features" className="landing-btn-secondary">Explore the tools</Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Private by design · Built for consistent use · Educational research only</p>
        <DashboardPreview />
      </div>
    </section>
  );
}

function DashboardPreview() {
  const entries = [
    ["07:10", "DOSE", "Morning schedule completed", "Logged"],
    ["09:25", "LABS", "New panel review saved", "Reviewed"],
    ["12:40", "NUTRITION", "Daily protein target updated", "On track"],
    ["17:30", "TRAINING", "Upper body session", "Planned"],
  ];
  return (
    <div className="dashboard-shell mt-14 w-full max-w-6xl text-left">
      <div className="flex h-12 items-center justify-between border-b border-border bg-background/70 px-4 sm:px-5">
        <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 bg-primary" /> PEPLOG / OVERVIEW</div>
        <div className="hidden items-center gap-2 font-mono text-[10px] text-muted-foreground sm:flex"><span className="status-dot" /> SYSTEM CURRENT</div>
      </div>
      <div className="grid lg:grid-cols-[12rem_1fr]">
        <aside className="hidden border-r border-border p-4 lg:block">
          <div className="mb-5 font-mono text-[9px] uppercase text-muted-foreground">Performance record</div>
          {["Overview", "My protocol", "Dose tracker", "Lab analysis", "Nutrition", "Training log"].map((label, i) => (
            <div key={label} className={`mb-1 flex items-center gap-2 px-3 py-2 text-xs ${i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
              <span className={`h-1.5 w-1.5 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />{label}
            </div>
          ))}
        </aside>
        <div className="p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Protocol adherence" value="92%" detail="+8% this month" />
            <Metric label="Active schedule" value="4" detail="Items today" />
            <Metric label="Weekly sessions" value="5/6" detail="One remaining" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="dashboard-panel min-h-64 p-4 sm:p-5">
              <div className="flex items-center justify-between"><div><p className="dashboard-label">30-day consistency</p><p className="mt-1 text-2xl font-semibold">Your trend</p></div><LineChart className="text-primary" size={19} /></div>
              <div className="relative mt-7 h-36 border-b border-l border-border">
                <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-border" />
                <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-border" />
                <svg viewBox="0 0 600 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 118 C58 110, 72 82, 128 91 S220 120, 270 71 S350 64, 395 78 S492 45, 600 28" fill="none" stroke="var(--primary)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  <path d="M0 118 C58 110, 72 82, 128 91 S220 120, 270 71 S350 64, 395 78 S492 45, 600 28 L600 140 L0 140 Z" fill="url(#area)" />
                  <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".22"/><stop offset="1" stopColor="var(--primary)" stopOpacity="0"/></linearGradient></defs>
                </svg>
              </div>
            </div>
            <div className="dashboard-panel p-4 sm:p-5">
              <div className="flex items-center justify-between"><p className="dashboard-label">Today’s log</p><Activity className="text-primary" size={18} /></div>
              <div className="mt-4 divide-y divide-border">
                {entries.map(([time, type, text, state]) => <div key={time} className="grid grid-cols-[2.75rem_1fr] gap-3 py-3"><span className="font-mono text-[9px] text-muted-foreground">{time}</span><div><div className="text-[10px] font-semibold text-primary">{type} · {state}</div><div className="mt-1 text-xs text-foreground/80">{text}</div></div></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="dashboard-panel p-4"><p className="dashboard-label">{label}</p><div className="mt-3 flex items-end justify-between gap-3"><span className="text-2xl font-semibold">{value}</span><span className="text-[10px] text-primary">{detail}</span></div></div>;
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
      <div className="container-edge grid items-stretch lg:grid-cols-2">
        <div className="relative min-h-[30rem] overflow-hidden border border-border"><img src={handsBarImg} alt="Athlete gripping a loaded barbell" className="absolute inset-0 h-full w-full object-cover grayscale" width={1024} height={1024} loading="lazy" /><div className="absolute inset-0 bg-[linear-gradient(0deg,var(--background)_0%,transparent_65%)]" /><div className="absolute bottom-7 left-7 right-7 flex items-end justify-between border-t border-foreground/25 pt-4 text-[10px] uppercase text-foreground/70"><span>Training intelligence</span><Dumbbell size={17} /></div></div>
        <div className="border border-l-0 border-border p-7 sm:p-12 lg:p-16">
          <div className="landing-kicker">Built around you</div><h2 className="mt-5 font-landing text-4xl font-semibold leading-tight sm:text-6xl">Data informs.<br />Coaching decides.</h2>
          <p className="mt-7 max-w-xl leading-relaxed text-muted-foreground">PepLog brings your goals, training history, body composition, health context, and research interests into a clear plan—not a generic download.</p>
          <div className="mt-9 divide-y divide-border border-y border-border">
            {["Your intake shapes the plan from day one.", "Track the work and review what changes.", "Keep coaching, scheduling, and updates in one place."].map((text) => <div key={text} className="flex gap-3 py-4 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-primary" />{text}</div>)}
          </div>
          <Link to="/how-it-works" className="landing-text-link mt-7">See how it works <ChevronRight size={15} /></Link>
        </div>
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