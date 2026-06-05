import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Titan Elite Coaching" },
      { name: "description", content: "Coaching packages from $295/month to $1,495/quarter. Apply via intake." },
      { property: "og:title", content: "Pricing — Titan Elite" },
      { property: "og:description", content: "Foundation, Elite, Apex coaching tiers." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const tiers = [
    { n: "Foundation", p: "$199", per: "one-time", d: "For lifters establishing a base.", b: ["4-week training block", "Educational peptide notes", "Email support", "One-time program delivery"] },
    { n: "Elite", p: "$399", per: "/ month", d: "Most clients start here.", h: true, b: ["Full custom programming", "Custom peptide protocol", "Weekly check-ins", "Direct messaging", "Progress tracking dashboard"] },
    { n: "Apex", p: "$899", per: "/ quarter", d: "For competitors and committed long-cycle clients.", b: ["Quarterly programming reset", "Bloodwork review (educational)", "Bi-weekly video call", "Priority access & messaging", "Custom recovery & nutrition guidance"] },
  ];
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20">
        <div className="text-eyebrow">Investment</div>
        <h1 className="mt-4 text-6xl lg:text-8xl">Pricing.</h1>
        <p className="mt-6 max-w-2xl text-muted-foreground">
          Transparent tiers. No hidden upsells. All packages include the secure client
          dashboard for protocol delivery and messaging.
        </p>
      </section>
      <section className="container-edge pb-24">
        <div className="grid md:grid-cols-3 gap-px bg-foreground/15">
          {tiers.map((t) => (
            <div key={t.n} className={`p-10 ${t.h ? "bg-ink text-bone" : "bg-background"}`}>
              {t.h && <div className="text-blood font-mono text-[10px] uppercase tracking-[0.18em] mb-4">Most Selected</div>}
              <div className="font-display text-4xl">{t.n}</div>
              <p className={`mt-2 text-sm ${t.h ? "text-bone/70" : "text-muted-foreground"}`}>{t.d}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-6xl">{t.p}</span>
                <span className="font-mono text-xs uppercase tracking-wider opacity-60">{t.per}</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {t.b.map((x) => (
                  <li key={x} className="flex gap-2"><Check size={16} className="text-blood shrink-0 mt-0.5" /><span>{x}</span></li>
                ))}
              </ul>
              <Link to="/intake" className={`mt-10 inline-flex ${t.h ? "btn-blood hover:btn-blood-hover" : "btn-ghost hover:bg-foreground hover:text-background"}`}>Apply</Link>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Payment processing via Stripe will be enabled after intake review. Educational content only — not medical advice.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
