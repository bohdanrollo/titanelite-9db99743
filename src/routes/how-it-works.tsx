import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Titan Elite" },
      { name: "description", content: "Four steps to unlock your Titan Elite dashboard: apply, get reviewed, receive your 100% custom protocol, and use the tools daily." },
      { property: "og:title", content: "How It Works — Titan Elite" },
      { property: "og:description", content: "Four steps to unlock your Titan Elite dashboard: apply, get reviewed, receive your 100% custom protocol, and use the tools daily." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const steps = [
    { n: "01", t: "Apply", d: "Share your goals, training history, health background, and peptide interests to unlock dashboard access." },
    { n: "02", t: "Review", d: "We analyze your intake and build a 100% custom educational peptide protocol and weight-programming plan around your goals." },
    { n: "03", t: "Deliver", d: "Your custom protocol and weight program are delivered as a PDF and attached to your account dashboard." },
    { n: "04", t: "Use", d: "Log in to track your stack, ask AI peptide questions, calculate doses, and reference every guide." },
  ];
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <section className="container-edge py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-12 items-end mb-16">
          <div className="lg:col-span-7">
            <div className="text-eyebrow">How It Works</div>
            <h1 className="mt-4 text-5xl lg:text-7xl">Four steps. <br />One dashboard.</h1>
          </div>
          <p className="lg:col-span-5 text-muted-foreground">
            The dashboard is the product. Apply, get reviewed, receive your 100% custom educational peptide protocol and weight programming, and use the tools every day.
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
      <SiteFooter />
    </div>
  );
}
