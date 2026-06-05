import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Dumbbell, FlaskConical, ClipboardList, Activity } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Titan Elite Coaching" },
      { name: "description", content: "Custom weightlifting programming, educational peptide protocols, and accountability coaching." },
      { property: "og:title", content: "Services — Titan Elite" },
      { property: "og:description", content: "Custom programming, peptide education, accountability." },
    ],
  }),
  component: Services,
});

function Services() {
  const items = [
    { i: Dumbbell, t: "Custom Weightlifting Programming", d: "Periodized blocks designed around your training age, goals, equipment access, and recovery. Hypertrophy, strength, recomposition." },
    { i: FlaskConical, t: "Educational Peptide Protocols", d: "Strictly educational protocol templates covering common peptides — dosing windows, cycle structures, monitoring considerations. Not medical advice." },
    { i: ClipboardList, t: "Intake & Bloodwork Review", d: "Comprehensive intake analysis. Bring-your-own bloodwork interpretation against general performance markers (educational)." },
    { i: Activity, t: "Accountability Coaching", d: "Weekly check-ins, direct messaging access, and ongoing programming adjustments. The compounding factor most clients are missing." },
  ];
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20">
        <div className="text-eyebrow">Services</div>
        <h1 className="mt-4 text-6xl lg:text-8xl">What I do.</h1>
        <p className="mt-6 max-w-2xl text-muted-foreground">
          One coach. One system. Built for serious lifters who want their physique and
          programming to be designed, not borrowed.
        </p>
      </section>
      <section className="container-edge pb-24">
        <div className="grid md:grid-cols-2 gap-px bg-foreground/15">
          {items.map((s) => (
            <div key={s.t} className="bg-background p-10">
              <s.i className="text-blood" size={32} strokeWidth={1.2} />
              <h2 className="font-display text-3xl mt-6">{s.t}</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 border-t border-foreground/10 pt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="font-display text-3xl">Ready to apply?</p>
          <Link to="/intake" className="btn-blood hover:btn-blood-hover">Begin Intake</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
