import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Beaker,
  Bot,
  CalendarDays,
  Calculator,
  ChartNoAxesCombined,
  ChevronRight,
  Dna,
  Dumbbell,
  FlaskConical,
  Layers3,
  Utensils,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroLogoAsset from "@/assets/titan-elite-hero-logo.png.asset.json";
import handsBarImg from "@/assets/hands-bar.jpg";
import protocolImg from "@/assets/protocol.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Elite — Precision Fitness Coaching" },
      { name: "description", content: "Precision fitness coaching, peptide research, lab analysis, nutrition tracking, and personalized protocols in one private dashboard." },
      { property: "og:title", content: "Titan Elite — Precision Fitness Coaching" },
      { property: "og:description", content: "Precision coaching, research tools, and personalized protocols in one private performance dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const platformTools = [
  { icon: FlaskConical, title: "Lab Analysis", body: "Upload blood panels and turn complex markers into a clearer, saved review." },
  { icon: Utensils, title: "Nutrition", body: "Track calories, macros, branded foods, daily targets, and progress history." },
  { icon: Calculator, title: "Dose Calculator", body: "Calculate research doses with a precise 1 mL, 100-unit syringe visual." },
  { icon: Layers3, title: "My Stack", body: "Keep compounds, timing, dose schedules, and completion history organized." },
  { icon: Bot, title: "Pep Talk AI", body: "Ask peptide research questions and explore answers inside the platform." },
  { icon: Beaker, title: "Research Library", body: "Browse 60+ compounds with research notes, profiles, and citations." },
];

function Home() {
  return (
    <div className="landing-dark min-h-dvh bg-background text-foreground selection:bg-blood selection:text-bone">
      <SiteHeader />
      <main>
        <Hero />
        <ProofStrip />
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
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-border">
      <div className="absolute inset-0">
        <img
          src={heroLogoAsset.url}
          alt=""
          className="h-full w-full object-cover object-center opacity-40"
          width={1200}
          height={900}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_92%,transparent)_45%,color-mix(in_oklab,var(--background)_55%,transparent)_72%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--background)_0%,transparent_45%)]" />
      </div>

      <div className="container-edge relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-between py-10 sm:py-14 lg:py-16">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            <span className="h-px w-8 bg-blood" />
            Private performance platform
          </div>
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            Research · Training · Accountability
          </div>
        </div>

        <div className="flex max-w-4xl flex-col py-10 lg:py-20">
          <h1 className="font-landing text-[clamp(4.6rem,11vw,9.5rem)] font-semibold uppercase leading-[0.78] tracking-normal text-foreground">
            Titan<br />
            <span className="text-outline">Elite</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Precision coaching, performance tracking, and peptide research—built into one private system for people who take progress seriously.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/auth" className="landing-btn-primary">
              Get dashboard access <ArrowRight size={16} />
            </Link>
            <Link to="/features" className="landing-btn-secondary">
              See dashboard tools
            </Link>
            <Link to="/pephub" className="landing-text-link">
              Join PepHub free <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="grid max-w-3xl grid-cols-3 border-t border-border pt-6">
          {[
            ["21", "Integrated tools"],
            ["60+", "Research compounds"],
            ["1", "Private dashboard"],
          ].map(([number, label]) => (
            <div key={label} className="border-l border-border pl-4 first:border-l-0 first:pl-0 sm:pl-7">
              <div className="font-landing text-2xl font-semibold sm:text-3xl">{number}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="border-b border-border bg-blood text-primary-foreground">
      <div className="container-edge grid gap-5 py-7 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <p className="font-landing text-2xl font-medium leading-tight sm:text-3xl">One operating system for your performance.</p>
        <span className="hidden h-10 w-px bg-primary-foreground/30 md:block" />
        <p className="max-w-xl text-sm leading-relaxed text-primary-foreground/80 md:justify-self-end">
          Your training, nutrition, lab review, peptide research, scheduling, and custom plan stay connected—not scattered across apps.
        </p>
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section className="border-b border-border py-20 sm:py-28">
      <div className="container-edge">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <div className="landing-kicker">The platform</div>
            <h2 className="mt-5 font-landing text-4xl font-medium leading-[0.95] sm:text-6xl">
              Serious tools.<br /><span className="text-muted-foreground">Zero clutter.</span>
            </h2>
          </div>
          <p className="max-w-2xl self-end text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every tool has a job: make your plan easier to understand, easier to follow, and easier to measure over time.
          </p>
        </div>

        <div className="mt-14 grid border-l border-t border-border md:grid-cols-2 xl:grid-cols-3">
          {platformTools.map(({ icon: Icon, title, body }, index) => (
            <Link
              key={title}
              to="/features"
              className="group min-h-64 border-b border-r border-border p-7 transition-colors duration-300 hover:bg-accent sm:p-9"
            >
              <div className="flex items-start justify-between">
                <Icon size={21} className="text-blood" strokeWidth={1.7} />
                <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="mt-16 font-landing text-2xl font-medium normal-case leading-tight">{title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
              <ArrowRight size={16} className="mt-6 text-blood transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Method() {
  return (
    <section className="border-b border-border bg-landing-surface py-20 sm:py-28">
      <div className="container-edge">
        <div className="grid items-stretch gap-0 lg:grid-cols-2">
          <div className="relative min-h-[32rem] overflow-hidden">
            <img src={handsBarImg} alt="Athlete gripping a loaded barbell" className="absolute inset-0 h-full w-full object-cover grayscale" width={1024} height={1024} loading="lazy" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--landing-surface)_0%,transparent_55%)]" />
            <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between border-t border-foreground/25 pt-4 text-[10px] uppercase tracking-[0.18em] text-foreground/70">
              <span>Training intelligence</span><Dumbbell size={17} />
            </div>
          </div>
          <div className="border border-border p-7 sm:p-12 lg:p-16">
            <div className="landing-kicker">Built around you</div>
            <h2 className="mt-5 font-landing text-4xl font-medium leading-[0.95] sm:text-6xl">Data informs.<br />Coaching decides.</h2>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground">
              Titan Elite combines your goals, training history, body composition, health context, and research interests into a clear plan—not a generic download.
            </p>
            <div className="mt-10 divide-y divide-border border-y border-border">
              {[
                { icon: Dna, title: "Personal context", body: "Your intake shapes the plan from day one." },
                { icon: ChartNoAxesCombined, title: "Visible progress", body: "Track the work and review what changes." },
                { icon: CalendarDays, title: "Ongoing support", body: "Keep coaching, scheduling, and updates in one place." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="grid grid-cols-[auto_1fr] gap-5 py-5">
                  <Icon size={19} className="mt-1 text-blood" strokeWidth={1.7} />
                  <div><h3 className="font-landing text-lg font-medium normal-case">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{body}</p></div>
                </div>
              ))}
            </div>
            <Link to="/how-it-works" className="landing-text-link mt-8">See how it works <ArrowRight size={15} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-36">
      <img src={protocolImg} alt="Research protocol materials arranged on a work surface" className="absolute inset-0 h-full w-full object-cover opacity-30 grayscale" width={1024} height={1024} loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_82%,transparent)_65%,var(--background)_100%)]" />
      <div className="container-edge relative z-10">
        <div className="landing-kicker">Your next phase</div>
        <h2 className="mt-5 max-w-4xl font-landing text-5xl font-medium leading-[0.88] sm:text-7xl lg:text-8xl">
          Stop collecting advice.<br /><span className="text-outline">Start running a system.</span>
        </h2>
        <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground">
          Join Titan Elite for private dashboard access, connected performance tools, and a plan built around your goals.
        </p>
        <Link to="/auth" className="landing-btn-primary mt-9">Get dashboard access <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}