import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Health & Educational Disclaimer — Titan Elite" },
      { name: "description", content: "Important health and educational disclaimer for Titan Elite coaching." },
      { property: "og:title", content: "Disclaimer — Titan Elite" },
      { property: "og:description", content: "Educational content only — not medical advice." },
    ],
  }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20 max-w-3xl">
        <div className="text-eyebrow">Disclaimer</div>
        <h1 className="mt-4 text-5xl lg:text-7xl">Educational content only.</h1>
        <div className="mt-10 border-l-2 border-blood pl-6 py-4 bg-muted">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-blood" size={22} />
            <span className="font-display text-2xl">Important Notice</span>
          </div>
          <p className="text-sm leading-relaxed">
            All content on this site, including peptide protocol templates and coaching
            materials, is provided <strong>strictly for educational and informational
            purposes only</strong>. It is <strong>not medical advice</strong> and is not
            intended to diagnose, treat, cure, or prevent any disease or condition.
          </p>
        </div>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="No Doctor-Patient Relationship">
            Titan Elite is a fitness coaching service. Use of this site does not create a
            doctor-patient, medical, or therapeutic relationship between you and Titan Elite
            or any of its coaches.
          </Section>
          <Section title="Peptide Information">
            We do not prescribe, sell, distribute, or supply peptides or any other regulated
            substance. Information shared regarding peptide protocols is educational only.
            The legal status of peptides varies by jurisdiction and intended use. You are
            solely responsible for understanding and complying with the laws applicable to
            you.
          </Section>
          <Section title="Consult a Licensed Provider">
            Before starting any exercise program, supplement, peptide, or hormonal protocol,
            consult a licensed physician, especially if you have a pre-existing condition,
            are pregnant, or are taking medication. Stop any activity immediately if you
            experience adverse effects and seek medical attention.
          </Section>
          <Section title="Assumption of Risk">
            Weightlifting and any related activity carries inherent risk of injury or death.
            By using this site and our services, you assume full responsibility for that
            risk. See our Terms of Service for the full liability waiver.
          </Section>
          <Section title="No Guarantee of Results">
            Individual results vary. Photos, testimonials, and case studies are
            representative and not promises of specific outcomes. Adherence, genetics, sleep,
            nutrition, and many other factors materially affect results.
          </Section>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
