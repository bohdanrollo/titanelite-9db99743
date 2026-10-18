import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Beaker,
  Bot,
  Check,
  ChevronRight,
  
  FlaskConical,
  Layers3,
  Syringe,
  Utensils,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

import protocolImg from "@/assets/protocol.jpg";
import phoneImage from "@/assets/peplog-iphone-dashboard-clean.png";

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
    <div className="landing-light welcome-blue min-h-dvh bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <SignalStrip />
        <Giveaway />
        <Platform />
        <Method />
        <Closing />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border px-0 pt-16 sm:pt-20">
      <div className="container-edge relative z-10 flex flex-col items-center text-center">
        <h1 className="mt-7 max-w-5xl font-landing text-5xl font-semibold leading-[1.02] sm:text-7xl lg:text-[5.75rem]">
          Track the protocol.<br /><span className="text-primary">Read the signals.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl">
          PepLog brings peptide research, custom protocols, training, nutrition, labs, and coaching into one precise performance record.
        </p>
        <div className="mt-8 flex w-full max-w-3xl flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/auth" className="landing-btn-primary">Get free Basic access <ArrowRight size={16} /></Link>
          <Link to="/features" className="landing-btn-secondary">Explore the tools</Link>
          <Link to="/pephub" className="landing-btn-secondary">Go to PepHub</Link>
          <Link to="/peptide-calculator" className="landing-btn-secondary">Free calculator</Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Basic Access is free with an account · AI and coaching available on paid plans</p>
        <a href="#rolex-giveaway" className="landing-text-link mt-4 text-sm">PepLog.io Rolex giveaway <ChevronRight size={15} /></a>
        <div className="relative mt-10 w-full max-w-3xl">
          <img
            src={phoneImage}
            alt="PepLog My Stack screen on a phone, showing a weekly dosing schedule with morning and evening injections"
            className="relative z-10 aspect-square w-full object-contain"
            width={768}
            height={768}
            loading="eager"
            fetchPriority="high"
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

function Giveaway() {
  return (
    <section id="rolex-giveaway" aria-labelledby="giveaway-title" className="scroll-mt-20 border-b border-border py-16 sm:py-24">
      <div className="container-edge">
        <div className="max-w-3xl">
          <div className="landing-kicker">The PepLog.io giveaway</div>
          <h2 id="giveaway-title" className="mt-5 font-landing text-4xl font-semibold leading-tight sm:text-5xl">Win a Rolex<br />GMT-Master.</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">A stainless steel GMT-Master with the blue and black Batman bezel.</p>
          <h3 className="mt-8 font-landing text-lg font-semibold normal-case">Entry requirements</h3>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            <li className="flex gap-4 py-5"><span className="font-mono text-sm text-primary">01</span><p className="text-sm leading-relaxed">Be paying for a PepLog plan.</p></li>
            <li className="flex gap-4 py-5"><span className="font-mono text-sm text-primary">02</span><p className="text-sm leading-relaxed">Be signed up to receive both emails and texts from PepHub.</p></li>
            <li className="flex gap-4 py-5"><span className="font-mono text-sm text-primary">03</span><p className="text-sm leading-relaxed">Invite friends for extra entries. Extra entries count only after your invited friend enters the giveaway.</p></li>
          </ol>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/checkout" className="landing-btn-primary">View plans <ArrowRight size={16} /></Link>
            <Link to="/pephub" className="landing-btn-secondary">Visit PepHub</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Basic Access", price: "Free", period: "Included with your account",
      features: ["Peptide research library & learning guides", "My Stack, dose tracking & calculator", "Nutrition, workouts, progress & wellness logs"],
      note: "No AI tools or coaching.", action: "Get free Basic access", to: "/auth" as const,
    },
    {
      name: "Limited Access", price: "$10.99", period: "per month",
      features: ["Everything in Basic Access", "Pep Talk AI & AI Stack Builder", "Blood panel Lab Analysis"],
      note: "All AI tools included. No coaching.", action: "Choose Limited Access", to: "/checkout" as const,
    },
    {
      name: "Elite Access", price: "$250", period: "per month",
      features: ["Everything in Limited Access", "Custom peptide & training protocols", "Coach messaging, calls & scheduling", "Priority coach support", "Increased peptide discounts"],
      note: "All tools, AI and coaching included.", action: "Choose Elite Access", to: "/checkout" as const,
    },
  ];

  return (
    <section id="plans" aria-labelledby="plans-title" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-edge">
        <div className="landing-kicker">Plans & pricing</div>
        <h2 id="plans-title" className="mt-5 font-landing text-4xl font-semibold leading-tight sm:text-5xl">Start free. Go further.</h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">Free tracking and research. Add AI insights or personal coaching when you need them.</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6 sm:p-8">
              <h3 className="font-landing text-xl font-semibold normal-case">{plan.name}</h3>
              <p className="mt-5 font-landing text-4xl font-semibold">{plan.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.period}</p>
              <ul className="mt-7 space-y-4 text-sm">
                {plan.features.map((feature) => <li key={feature} className="flex gap-3"><Check size={17} className="mt-0.5 shrink-0 text-primary" /><span>{feature}</span></li>)}
              </ul>
              <p className="mb-7 mt-5 text-xs leading-relaxed text-muted-foreground">{plan.note}</p>
              <Button asChild variant="outline" className="landing-btn-secondary mt-auto h-auto w-full whitespace-normal text-center">
                <Link to={plan.to}>{plan.action}<ArrowRight size={16} /></Link>
              </Button>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Prices in USD. Paid plans billed monthly; cancel anytime. Find an affiliate code for a discount!</p>
      </div>
    </section>
  );
}

function Method() {
  return (
    <section className="border-b border-border bg-secondary/30 py-20 sm:py-28">
      <div className="container-edge">
        <div className="border border-border p-7 sm:p-12 lg:p-16">
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