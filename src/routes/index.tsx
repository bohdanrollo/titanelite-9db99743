import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroImg from "@/assets/titan-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Elite — Peptide & Training Dashboard" },
      { name: "description", content: "All-in-one client dashboard for peptide research and weightlifting: AI peptide answers, 50-compound library, dose calculator, stack tracker, injection guides, and a 100% custom educational peptide protocol with weight programming." },
      { property: "og:title", content: "Titan Elite — Peptide & Training Dashboard" },
      { property: "og:description", content: "All-in-one client dashboard for peptide research and weightlifting: AI peptide answers, 50-compound library, dose calculator, stack tracker, injection guides, and a 100% custom educational peptide protocol with weight programming." },
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
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />
      <Hero />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-foreground/10 flex-1">
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
            Plus, every client receives a 100% custom educational peptide protocol and weight-programming plan built around their goals.
            No guesswork. No scattered tabs. Just the tools you need to research and train with precision.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/auth" className="btn-blood hover:btn-blood-hover">
              Get Dashboard Access <ArrowRight size={14} />
            </Link>
            <Link to="/features" className="btn-ghost hover:bg-foreground hover:text-background">
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
