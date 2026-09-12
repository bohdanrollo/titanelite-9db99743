import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell, FlaskConical, FileText, MessageCircle, MessagesSquare, Beaker, Apple, ListChecks, Droplets, Syringe, Calculator, Activity, TrendingUp, HeartPulse, NotebookPen, Sparkles, Phone, Layers, BookOpen, Scale } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Dashboard Features — Titan Elite" },
      { name: "description", content: "Twenty-one tools inside the Titan Elite client dashboard: blood panel lab analysis, calorie and macro tracker, progress and workout logging, wellness tracking, AI stack builder, custom protocols, coach messaging and calls, Pep Talk AI, peptide library, combos, dosing guide, dose calculator, stack tracker, learning center, and more." },
      { property: "og:title", content: "Dashboard Features — Titan Elite" },
      { property: "og:description", content: "Twenty-one tools inside the Titan Elite client dashboard: blood panel lab analysis, calorie and macro tracker, progress and workout logging, wellness tracking, AI stack builder, custom protocols, coach messaging and calls, Pep Talk AI, peptide library, combos, dosing guide, dose calculator, stack tracker, learning center, and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const items = [
    { i: FileText, t: "Custom Protocols", d: "Receive a 100% custom educational peptide protocol and weight-programming plan built from your intake, delivered as a PDF. Elite Access only." },
    { i: MessagesSquare, t: "Coach Messaging", d: "Message your coach directly from the dashboard and get replies in the same thread. Included with Full Access." },
    { i: Phone, t: "Coach Calls", d: "Book a 30-minute call with your coach on fitness or peptides — pick a weekday slot between 8 AM and 8 PM, at least 48 hours ahead. Elite Access only." },
    { i: MessageCircle, t: "Pep Talk AI", d: "Ask anything about peptide effects, dosing, timing, stacking, and safety — instant research answers." },
    { i: Beaker, t: "Top 50 Peptides", d: "A searchable research library covering the most popular compounds and what each is studied for." },
    { i: Layers, t: "Combo Guides", d: "Research-informed breakdowns of popular peptide combinations — pathways, overlap, and the questions to ask before stacking." },
    { i: Syringe, t: "Dosing Guide", d: "Typical research dosing ranges, escalation steps, cycling and weekly schedules for 21 compounds — with mechanism of action and what researchers observe over time. Included with Limited and Full Access." },

    { i: ListChecks, t: "My Stack & Dose Tracker", d: "Track every peptide, dose, unit, frequency, schedule, and notes — with a weekly calendar that auto-fills morning, afternoon, and evening doses you can check off each day." },
    { i: BookOpen, t: "Learning Center", d: "Foundational guides like Peptides 101 — what peptides are, how they signal in the body, and how to source and handle them responsibly." },
    { i: Scale, t: "Myths vs Evidence", d: "Common peptide claims weighed against what the research actually shows, so you can separate hype from signal." },
    { i: Droplets, t: "Supplies Guide", d: "BAC water, insulin syringes, alcohol wipes, plus storage techniques before and after reconstitution." },
    { i: FlaskConical, t: "Reconstitution", d: "Step-by-step mixing instructions: roll the vial gently in your hands until the powder dissolves — never shake." },
    { i: Syringe, t: "Injection Guide", d: "Subcutaneous injection site diagrams, rotation advice, and sterile technique walkthroughs." },
    { i: Calculator, t: "Dose Calculator", d: "Input vial strength, desired dose, and BAC water to see the exact draw volume on a 1 mL syringe." },
    { i: Activity, t: "Lab Analysis", d: "Upload your blood test panel and enter your age, height, and weight to see what's outside optimal range and how to fix it. Results save and can be updated or re-uploaded anytime." },
    { i: Apple, t: "Calorie Tracker", d: "Set a daily calorie goal and get automatic protein, carb, and fat targets. Search foods and drinks by brand, log them in one tap, and macros fill in for you. Days reset automatically and every past day is saved in your history." },
    { i: Dumbbell, t: "Lifting & Nutrition", d: "Training splits, popular lifts, and caloric / macro targets tailored to bulking, cutting, or maintenance." },
    { i: TrendingUp, t: "Progress Tracker", d: "Log weight and body fat over time with an automatic trend chart — your full history is saved." },
    { i: NotebookPen, t: "Workout Logger", d: "Record exercises, sets, reps, and weight for every session. Personal records are tracked automatically." },
    { i: HeartPulse, t: "Wellness Tracker", d: "Track daily water intake, sleep hours, and steps with a per-day history." },
    { i: Sparkles, t: "AI Stack Builder", d: "Pick a goal and get an educational research-oriented peptide stack with typical dosing, timing, and cycling guidance. Elite Access only." },
  ];
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <section className="bg-ink text-bone py-24 lg:py-32 border-y border-foreground/15">
        <div className="container-edge">
          <div className="text-eyebrow">Built-In Tools</div>
          <h1 className="mt-4 text-5xl lg:text-7xl max-w-4xl">
            Twenty-one tools. <span className="text-blood">One dashboard.</span>
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
