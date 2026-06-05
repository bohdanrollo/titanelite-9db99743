import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import physique from "@/assets/physique.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Titan Elite" },
      { name: "description", content: "The coaching philosophy and standards behind Titan Elite." },
      { property: "og:title", content: "About — Titan Elite" },
      { property: "og:description", content: "Engineered coaching for serious lifters." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <div className="text-eyebrow">About</div>
          <h1 className="mt-4 text-6xl lg:text-7xl">Coaching as a craft.</h1>
          <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed max-w-prose">
            <p>
              Titan Elite was built around one principle: serious clients deserve
              programming that's actually designed for them. Not a template. Not a PDF
              someone bought once and resold a thousand times. A real document built
              around your training history, your goals, and your physiology.
            </p>
            <p>
              Our team has coached lifters and physique competitors for over a decade, and
              we've spent the last several years studying the educational landscape around
              peptide protocols — what's evidence-informed, what's hype, and how to
              think about it responsibly.
            </p>
            <p>
              Titan Elite does not prescribe, sell, or distribute peptides. Everything
              shared is strictly educational and intended to inform conversations with
              your licensed medical provider.
            </p>
          </div>
          <Link to="/intake" className="mt-10 inline-flex btn-blood hover:btn-blood-hover">Apply for coaching</Link>
        </div>
        <div className="lg:col-span-5">
          <div className="aspect-[3/4] overflow-hidden">
            <img src={physique} alt="Athlete back double bicep" className="size-full object-cover" loading="lazy" />
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
