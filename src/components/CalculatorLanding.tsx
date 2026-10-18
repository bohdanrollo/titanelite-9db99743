import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PeptideCalculator } from "@/components/PeptideCalculator";

export type CalcSection = { heading: string; paragraphs: string[] };

export function CalculatorLanding({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: CalcSection[];
}) {
  return (
    <div className="landing-light min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="container-edge py-16">
          <div className="text-eyebrow">{eyebrow}</div>
          <h1 className="mt-4 font-landing text-4xl font-semibold sm:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{intro}</p>
        </section>
        <section className="container-edge pb-16">
          <PeptideCalculator />
        </section>
        <section className="container-edge pb-12">
          <div className="max-w-3xl rounded-2xl border border-foreground/10 bg-card p-7 shadow-sm">
            <h2 className="font-landing text-2xl font-semibold">Track every dose for free</h2>
            <p className="mt-3 text-muted-foreground">
              Create a free PepLog account to save your stack, log doses, and get your personal peptide discount code.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/auth" className="landing-btn-primary">Create free account</Link>
              <Link to="/features" className="landing-btn-secondary">See all features</Link>
            </div>
          </div>
        </section>
        <section className="container-edge pb-16 max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
          {sections.map((s) => (
            <div key={s.heading} className="space-y-3">
              <h2 className="font-landing text-2xl font-semibold text-foreground">{s.heading}</h2>
              {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          ))}
          <p className="text-sm">
            For educational research reference only. Not medical advice. Double-check every calculation yourself.
          </p>
          <p>
            Need the general tool?{" "}
            <Link to="/peptide-calculator" className="text-primary underline">Open the free peptide calculator</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function calcHead(path: string, title: string, desc: string) {
  const url = `https://peplog.io${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
