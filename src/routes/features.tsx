import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell, FlaskConical, FileText, MessageCircle, Beaker, ListChecks, Droplets, Syringe, Calculator } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Dashboard Features — Titan Elite" },
      { name: "description", content: "Nine tools inside the Titan Elite client dashboard: custom protocols, Pep Talk AI, Top 50 Peptides library, dose calculator, stack tracker, and more." },
      { property: "og:title", content: "Dashboard Features — Titan Elite" },
      { property: "og:description", content: "Nine tools inside the Titan Elite client dashboard: custom protocols, Pep Talk AI, Top 50 Peptides library, dose calculator, stack tracker, and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const items = [
    { i: FileText, t: "Custom Protocols", d: "Receive a 100% custom educational peptide protocol and weight-programming plan built from your intake, delivered as a PDF." },
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
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <section className="bg-ink text-bone py-24 lg:py-32 border-y border-foreground/15">
        <div className="container-edge">
          <div className="text-eyebrow">Built-In Tools</div>
          <h1 className="mt-4 text-5xl lg:text-7xl max-w-4xl">
            Nine tools. <span className="text-blood">One dashboard.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-bone/70 leading-relaxed">
            No more scattered notes, calculators, or search tabs. The Titan Elite dashboard puts peptides, dosing, and training guidance in one place.
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
      <SiteFooter />
    </div>
  );
}
