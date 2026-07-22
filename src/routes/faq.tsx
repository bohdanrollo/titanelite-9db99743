import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Titan Elite" },
      { name: "description", content: "Answers to common questions about Titan Elite's custom fitness protocols, peptide education tools, and the client dashboard." },
      { property: "og:title", content: "FAQ — Titan Elite" },
      { property: "og:description", content: "Answers to common questions about Titan Elite's custom fitness protocols, peptide education tools, and the client dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FAQ,
});

const faqs = [
  { q: "What is Titan Elite?", a: "Titan Elite is a fitness and peptide education platform built around a fully loaded client dashboard. Members get a 100% custom educational peptide protocol and weight-training program, plus research tools like a peptide calculator, reconstitution guide, injection guide, and an AI assistant called Pep Talk." },
  { q: "Do you prescribe peptides?", a: "No. Titan Elite provides educational protocol templates only. We do not diagnose, treat, prescribe, sell, or distribute peptides. All information is for educational purposes and is not medical advice. Always consult a licensed medical provider." },
  { q: "How custom is the programming?", a: "Every protocol and training program is built from scratch around your intake. No recycled templates. Programming evolves with your goals, training history, body composition targets, and recovery needs." },
  { q: "Do I need a gym?", a: "Yes. Full barbell access is strongly recommended for the weight programming. A commercial gym or well-equipped home setup works well." },
  { q: "How do I sign up and access my dashboard?", a: "Sign up or sign in through the Auth page, and you'll go straight to your client dashboard. The intake form is optional — you can begin it whenever you're ready by pressing 'Begin Intake.'" },
  { q: "How do I receive my protocol?", a: "After you submit an intake, the admin reviews it, builds your custom protocol, and delivers it as a downloadable PDF inside your dashboard. You'll also receive an email when it's ready." },
  { q: "What's inside the client dashboard?", a: "The dashboard is organized into four areas: Plan (your protocol and intake), Research (peptide profiles, articles, lifting tips), Tools (supplies, reconstitution, injection guide, calculator, My Stack), and Assistant (Pep Talk AI chat)." },
  { q: "What is My Stack?", a: "My Stack is a personal tracker where you can log the peptides you're researching, the dose you're taking, and the schedule. Your entries are saved so you can review or edit them later." },
  { q: "How does the peptide calculator work?", a: "Enter the peptide strength, your desired dose, and the amount of BAC water used to reconstitute. The calculator shows the correct draw on a 1 mL / 100-unit syringe." },
  { q: "Where do I buy peptides and supplies?", a: "We do not sell peptides. For research supply needs, the dashboard links to Powerbuilt Labs, and using code BJR can save money on your order." },
  { q: "Can I become an affiliate?", a: "Yes. Apply through the Become an Affiliate page with your social handles, email, and phone number. Once approved, you get a unique referral link and code. Every five people who sign up through your link earns you $25." },
  { q: "Is my health data secure?", a: "Yes. Your data is encrypted at rest and in transit, and access is restricted to you and the admin. See our Privacy Policy for more details." },
  { q: "Do you work with women?", a: "Yes. The intake captures sex assigned at birth and hormonal context to help inform programming." },
];

function FAQ() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20">
        <div className="text-eyebrow">FAQ</div>
        <h1 className="mt-4 text-6xl lg:text-8xl">Questions.</h1>
      </section>
      <section className="container-edge pb-24">
        <div className="divide-y divide-foreground/10 border-y border-foreground/10">
          {faqs.map((x) => (
            <details key={x.q} className="group py-6">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display text-2xl lg:text-3xl pr-8">{x.q}</span>
                <ChevronDown className="text-blood group-open:rotate-180 transition shrink-0" />
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">{x.a}</p>
            </details>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
