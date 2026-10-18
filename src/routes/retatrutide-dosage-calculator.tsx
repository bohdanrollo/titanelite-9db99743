import { createFileRoute } from "@tanstack/react-router";
import { CalculatorLanding, calcHead } from "@/components/CalculatorLanding";

export const Route = createFileRoute("/retatrutide-dosage-calculator")({
  head: () =>
    calcHead(
      "/retatrutide-dosage-calculator",
      "Retatrutide Dosage Calculator — Units to Draw | PepLog",
      "Free retatrutide dosage calculator. Enter vial mg, bacteriostatic water and dose to see how many units to draw on a 100-unit syringe.",
    ),
  component: () => (
    <CalculatorLanding
      eyebrow="Free tool"
      title="Retatrutide Dosage Calculator"
      intro="Turn a retatrutide (GLP3 RT) dose in mg into units on a 1 mL, 100-unit syringe. Enter the vial strength, the water you added and your dose. No account needed."
      sections={[
        {
          heading: "Example retatrutide calculation",
          paragraphs: [
            "A 10 mg vial mixed with 2 mL of bacteriostatic water gives 5 mg per mL. A 1 mg dose is 1 ÷ 5 = 0.2 mL, which is 20 units on a 100-unit syringe.",
            "This example shows the math only. It is not a dosing recommendation.",
          ],
        },
        {
          heading: "Why the units change",
          paragraphs: [
            "Vial sizes and water amounts vary, so the same mg dose can be a different number of units. Re-run the calculator whenever you change vials or water.",
          ],
        },
      ]}
    />
  ),
});
