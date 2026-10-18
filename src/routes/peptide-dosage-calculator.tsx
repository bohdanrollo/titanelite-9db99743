import { createFileRoute } from "@tanstack/react-router";
import { CalculatorLanding, calcHead } from "@/components/CalculatorLanding";

export const Route = createFileRoute("/peptide-dosage-calculator")({
  head: () =>
    calcHead(
      "/peptide-dosage-calculator",
      "Peptide Dosage Calculator — mcg & mg to Units | PepLog",
      "Free peptide dosage calculator. Convert a mcg or mg dose into units on a 100-unit insulin syringe based on your vial and water.",
    ),
  component: () => (
    <CalculatorLanding
      eyebrow="Free tool"
      title="Peptide Dosage Calculator"
      intro="Convert a peptide dose in mcg or mg into units on a 1 mL, 100-unit syringe. Enter the vial strength, water added and your dose. No account needed."
      sections={[
        {
          heading: "mcg vs mg",
          paragraphs: [
            "1 mg equals 1,000 mcg. A 250 mcg dose is 0.25 mg. Mixing up the two is the most common dosing math mistake, so check the unit before you calculate.",
          ],
        },
        {
          heading: "Example dosage calculation",
          paragraphs: [
            "A 5 mg vial with 2 mL of water is 2.5 mg per mL. A 250 mcg (0.25 mg) dose is 0.25 ÷ 2.5 = 0.1 mL, which is 10 units on a 100-unit syringe.",
          ],
        },
      ]}
    />
  ),
});
