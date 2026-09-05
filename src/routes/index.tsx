import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FlaskConical,
  Utensils,
  Calculator,
  Layers,
  Bot,
  MessageSquare,
  GraduationCap,
  Syringe,
  Dumbbell,
  FileText,
  CalendarCheck,
  Sparkles,
  Beaker,
  BookOpen,
  Phone,
  TrendingUp,
  NotebookPen,
  HeartPulse,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroImg from "@/assets/titan-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Elite — Peptide & Training Dashboard" },
      { name: "description", content: "All-in-one client dashboard for peptide research and weightlifting: blood panel lab analysis, a calorie and macro tracker, direct coach messaging, AI peptide answers, 50-compound library, dose calculator, stack tracker, and a 100% custom educational peptide protocol with weight programming." },
      { property: "og:title", content: "Titan Elite — Peptide & Training Dashboard" },
      { property: "og:description", content: "All-in-one client dashboard for peptide research and weightlifting: blood panel lab analysis, a calorie and macro tracker, direct coach messaging, AI peptide answers, 50-compound library, dose calculator, stack tracker, and a 100% custom educational peptide protocol with weight programming." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-blood selection:text-bone">
      <SiteHeader />
      <Hero />
      <Bento />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* warm atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[120%] w-[130%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-blood)_12%,transparent)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-blood/40 to-transparent" />
      </div>


      <div className="container-edge relative z-10 grid lg:grid-cols-12 gap-12 pt-20 pb-20 lg:pt-28 lg:pb-28">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="text-eyebrow">Your complete research dashboard</div>
          <h1 className="mt-6 font-heavy text-5xl sm:text-6xl lg:text-8xl leading-[0.88] tracking-tight">
            Everything<br />
            <span className="text-blood">for peptides</span><br />
            &amp; training.
          </h1>
          <p className="mt-8 max-w-xl font-body text-base text-muted-foreground leading-relaxed">
            Upload your blood panel for an instant lab analysis, track your calories and macros, track your stack,
            calculate doses, message your coach directly, ask AI peptide questions, browse the 50-compound research
            library, and get step-by-step injection, reconstitution, and lifting guidance — all inside one client
            dashboard. Plus, every client receives a 100% custom educational peptide protocol and weight-programming
            plan built around their goals.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/auth"
              className="btn-blood shadow-[0_0_24px_color-mix(in_oklab,var(--color-blood)_35%,transparent)] hover:btn-blood-hover"
            >
              Get Dashboard Access <ArrowRight size={14} />
            </Link>
            <Link to="/features" className="btn-ghost text-[color:var(--foreground)] border-[color:color-mix(in_oklab,var(--foreground)_45%,transparent)] hover:bg-[color:var(--foreground)] hover:text-[color:var(--background)]">
              See Dashboard Tools
            </Link>
            <Link to="/pephub" className="btn-ghost text-blood border-blood/50 hover:bg-blood hover:text-bone">
              Join PepHub — Free
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-blood" />
              Simple monthly access. Cancel anytime.
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blood/40 bg-blood/10 px-4 py-1.5 text-blood">
              <span className="inline-block h-2 w-2 rounded-full bg-blood" />
              Clients get special peptide pricing
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 relative flex items-center">
          <div className="relative w-full rounded-xl bg-gradient-to-b from-blood/70 to-transparent p-px">
            <div className="relative overflow-hidden rounded-xl bg-ink">
              <img
                src={heroImg.url}
                alt="Titan Elite logo"
                className="w-full h-auto block"
                width={1600}
                height={1200}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-ink via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="text-bone font-mono text-[10px] uppercase tracking-[0.2em]">
                  File 037 / Deadlift, 4×3 @ 90%
                </div>
                <div className="h-px w-12 bg-blood" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="container-edge relative z-10">
        <div className="grid grid-cols-3 gap-6 border-t border-border py-10">
          {[
            { n: "50+", l: "Peptides catalogued" },
            { n: "AI", l: "Pep Talk assistant" },
            { n: "12", l: "Dashboard tools" },
          ].map((s, i) => (
            <div key={s.l} className="text-center sm:text-left">
              <div className={`font-heavy text-3xl sm:text-4xl ${i % 2 === 0 ? "text-blood" : "text-foreground"}`}>
                {s.n}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type DashboardTab = "protocols" | "labs" | "nutrition" | "calculator" | "mystack" | "dosing" | "peptalk" | "messages" | "learning" | "injection" | "lifting" | "calls" | "stackbuilder" | "peptides" | "combos" | "progress" | "workouts" | "wellness" | "supplies" | "reconstitution" | "myths";

type Tile = { icon: typeof FlaskConical; title: string; body: string; span: string; tab?: DashboardTab; feature?: boolean };

const TILES: Tile[] = [
  {
    icon: FileText,
    title: "Custom protocols",
    body: "A 100% custom educational peptide protocol and weight-programming plan built around your goals — delivered straight to your dashboard.",
    span: "md:col-span-2 md:row-span-2",
    tab: "protocols",
    feature: true,
  },
  { icon: FlaskConical, title: "Lab analysis", body: "Upload your blood panel with your age, height, and weight for instant AI read-outs on what's off and how to fix it.", span: "md:col-span-2", tab: "labs" },
  { icon: Utensils, title: "Calorie tracker", body: "Search foods and drinks by brand, log macros, and keep every past day saved.", span: "", tab: "nutrition" },
  { icon: Calculator, title: "Dose calculator", body: "A true-to-life 100-unit syringe that shows your exact draw.", span: "", tab: "calculator" },
  { icon: Layers, title: "My Stack", body: "Track every compound, dose, and cycle in one place.", span: "", tab: "mystack" },
  { icon: Syringe, title: "Dosing guide", body: "Research dosing ranges, escalations, and weekly schedules for 21 compounds.", span: "md:col-span-2", tab: "dosing" },

  { icon: Bot, title: "Pep Talk AI", body: "Ask peptide questions and get answers on demand.", span: "", tab: "peptalk" },
  { icon: Sparkles, title: "Stack Builder", body: "AI-assisted stack planning that builds around your goals.", span: "", tab: "stackbuilder" },
  { icon: Beaker, title: "Peptide library", body: "60+ compounds with research notes, molecular profiles, and citations.", span: "", tab: "peptides" },
  { icon: BookOpen, title: "Combo guides", body: "How compounds are commonly paired and what the research says.", span: "", tab: "combos" },
  { icon: MessageSquare, title: "Coach messaging", body: "Message your coach directly from the dashboard (Full Access).", span: "md:col-span-2", tab: "messages" },
  { icon: Phone, title: "Coach calls", body: "Book a 30-minute one-on-one call about fitness or peptides (Full Access).", span: "md:col-span-2", tab: "calls" },
  { icon: GraduationCap, title: "Learning center", body: "Mini courses on peptides, training, and nutrition fundamentals.", span: "", tab: "learning" },
  { icon: Scale, title: "Myth vs Evidence", body: "Popular peptide claims weighed against what the research actually shows.", span: "", tab: "myths" },
  { icon: Package, title: "Supplies checklist", body: "BAC water, syringes, alcohol wipes — everything you need, nothing you don't.", span: "", tab: "supplies" },
  { icon: FlaskConical, title: "Reconstitution guide", body: "Step-by-step mixing instructions with exact water-to-peptide ratios.", span: "", tab: "reconstitution" },
  { icon: Syringe, title: "Injection guide", body: "Safe injection technique, sites, and rotation walkthroughs.", span: "", tab: "injection" },
  { icon: Dumbbell, title: "Lifting library", body: "Programming principles and technique cues that actually move the bar.", span: "md:col-span-2", tab: "lifting" },
  { icon: TrendingUp, title: "Progress tracker", body: "Log weight, measurements, and milestones over time.", span: "", tab: "progress" },
  { icon: NotebookPen, title: "Workout logger", body: "Record sessions, sets, and PRs right in the dashboard.", span: "", tab: "workouts" },
  { icon: HeartPulse, title: "Wellness tracker", body: "Track sleep, energy, and recovery day by day.", span: "", tab: "wellness" },
  { icon: CalendarCheck, title: "Dose tracker", body: "A weekly calendar that builds itself from your stack — morning, afternoon, and evening doses, checked off as you take them.", span: "md:col-span-2", tab: "mystack" },
];

function Bento() {
  return (
    <section className="relative border-b border-border py-20 lg:py-28">
      <div className="container-edge">
        <div className="text-eyebrow">Inside the dashboard</div>
        <h2 className="mt-4 font-heavy text-4xl sm:text-5xl lg:text-6xl leading-[0.9] max-w-3xl">
          One login. <span className="text-blood">Every tool.</span>
        </h2>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            const inner = (
              <>
                <Icon size={t.feature ? 28 : 20} className="text-blood" />
                <h3
                  className={`mt-5 font-heavy tracking-tight ${
                    t.feature ? "text-2xl sm:text-3xl" : "text-lg"
                  }`}
                >
                  {t.title}
                </h3>
                <p className={`mt-3 font-body text-muted-foreground leading-relaxed ${t.feature ? "text-base max-w-md" : "text-sm"}`}>
                  {t.body}
                </p>
                {t.feature && (
                  <span className="mt-8 inline-flex items-center gap-2 font-mono text-[0.72rem] font-bold uppercase tracking-[0.14em] text-blood">
                    Start now <ArrowRight size={14} />
                  </span>
                )}
              </>
            );
            const base = `group relative card-soft p-6 block text-left transition duration-200 hover:-translate-y-1 hover:border-blood/40 hover:shadow-soft ${t.span} ${t.feature ? "md:p-10 bg-accent" : ""}`;
            if (t.tab) {
              return (
                <Link key={t.title} to="/dashboard" search={{ tab: t.tab }} className={base}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={t.title} className={base}>
                {inner}
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 card-soft bg-accent p-8">
          <div>
            <div className="font-heavy text-2xl sm:text-3xl">Ready to train with precision?</div>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              Get dashboard access today. Cancel anytime — no long-term contract.
            </p>
          </div>
          <Link to="/auth" className="btn-blood hover:btn-blood-hover">
            Get Dashboard Access <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </section>
  );
}
