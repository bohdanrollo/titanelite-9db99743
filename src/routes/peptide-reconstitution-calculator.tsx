import { createFileRoute } from "@tanstack/react-router";
import { CalculatorLanding, calcHead } from "@/components/CalculatorLanding";

export const Route = createFileRoute("/peptide-reconstitution-calculator")({
  head: () =>
    calcHead(
      "/peptide-reconstitution-calculator",
      "Peptide Reconstitution Calculator — BAC Water Mixing | PepLog",
      "Free peptide reconstitution calculator. See the concentration after adding bacteriostatic water and how many units to draw per dose.",
    ),
  component: () => (
    <CalculatorLanding
      eyebrow="Free tool"
      title="Peptide Reconstitution Calculator"
      intro="Figure out how much bacteriostatic water to add and what concentration you'll end up with. Enter the vial strength, water amount and dose to see your draw in units."
      sections={[
        {
          heading: "How reconstitution math works",
          paragraphs: [
            "Concentration equals the peptide in the vial divided by the water added. A 5 mg vial with 2 mL of water is 2.5 mg per mL.",
            "More water makes each unit weaker, so the same dose takes more units. Less water makes it stronger. Pick an amount that keeps your draw easy to read.",
          ],
        },
        {
          heading: "Choosing a water amount",
          paragraphs: [
            "Many people choose a water amount that turns their dose into a round number of units, such as 10 or 20. Try a few amounts in the calculator to compare.",
          ],
        },
      ]}
    />
  ),
});
