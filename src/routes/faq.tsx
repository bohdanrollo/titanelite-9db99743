import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Titan Elite" },
      { name: "description", content: "Frequently asked questions about Titan Elite coaching." },
      { property: "og:title", content: "FAQ — Titan Elite" },
      { property: "og:description", content: "Common questions answered." },
    ],
  }),
  component: FAQ,
});

const faqs = [
  { q: "Do you prescribe peptides?", a: "No. Titan Elite provides educational protocol templates only. We do not diagnose, treat, prescribe, sell, or distribute peptides. All information is for educational purposes and is not medical advice. Always consult a licensed medical provider." },
  { q: "How custom is the programming?", a: "Every protocol is built from scratch around your intake. No recycled templates. Programming evolves with your check-ins, recovery, and stated goals." },
  { q: "Do I need a gym?", a: "Yes. Full barbell access is strongly recommended. Commercial gym or well-equipped home setup works." },
  { q: "How long is the commitment?", a: "Most clients commit to a minimum 12-week block to see meaningful change." },
  { q: "How do I receive my protocol?", a: "After intake review, your custom protocol is delivered as a downloadable PDF inside your client dashboard." },
  { q: "Can I message the team directly?", a: "Yes. Direct messaging with your coach is available inside the dashboard. Replies within 24 hours on business days." },
  { q: "Is my health data secure?", a: "Yes. Your data is encrypted at rest and in transit. Access is restricted to you and your coach. See Privacy Policy." },
  { q: "Do you work with women?", a: "Yes. The intake captures sex assigned at birth and hormonal context to inform programming." },
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
