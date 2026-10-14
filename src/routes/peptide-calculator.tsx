import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PeptideCalculator } from "@/components/PeptideCalculator";

const TITLE = "Free Peptide Calculator — Reconstitution & Dosage | PepLog";
const DESC =
  "Free peptide reconstitution and dosage calculator. Enter vial strength, dose, and BAC water to see the draw on a 100-unit insulin syringe.";

export const Route = createFileRoute("/peptide-calculator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://peplog.io/peptide-calculator" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://peplog.io/peptide-calculator" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="landing-light min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="container-edge py-16">
          <div className="text-eyebrow">Free tool</div>
          <h1 className="mt-4 font-landing text-4xl font-semibold sm:text-6xl">Peptide Calculator</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Work out how many units to draw on a 1 mL (100-unit) syringe. Enter the total peptide in the vial,
            your dose, and how much bacteriostatic water you added. No account needed.
          </p>
        </section>
        <section className="container-edge pb-16">
          <PeptideCalculator />
        </section>
        <section className="container-edge pb-16 max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
          <h2 className="font-landing text-2xl font-semibold text-foreground">How the math works</h2>
          <p>
            Concentration equals vial strength divided by the water added. For example, 5 mg in 2 mL is 2.5 mg per mL.
            The volume to draw is your dose divided by that concentration: 250 mcg (0.25 mg) ÷ 2.5 mg/mL = 0.1 mL,
            which is 10 units on a 100-unit syringe.
          </p>
          <h2 className="font-landing text-2xl font-semibold text-foreground">Reconstitution basics</h2>
          <p>
            Adding more water makes each unit weaker, so the same dose needs more units. Adding less water makes the
            mixture stronger. Pick a water amount that keeps your draw easy to read on the syringe.
          </p>
          <p className="text-sm">
            For educational research reference only. Not medical advice. Double-check every calculation yourself.
          </p>
          <p>
            Want dosing guides, stack tracking, and more tools?{" "}
            <Link to="/features" className="text-primary underline">See the full PepLog dashboard</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
