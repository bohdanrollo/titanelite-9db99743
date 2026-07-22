import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckoutForm } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/lib/auth";
import { useAccess } from "@/lib/access";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Get Access — Titan Elite" },
      { name: "description", content: "Unlock the Titan Elite client dashboard: peptide research, calculators, protocols, and more." },
      { property: "og:title", content: "Get Access — Titan Elite" },
      { property: "og:description", content: "Unlock the Titan Elite client dashboard." },
    ],
  }),
  component: CheckoutPage,
});

type Plan = {
  id: "limited_access_onetime" | "full_access_lifetime";
  name: string;
  price: string;
  tag: string;
  features: string[];
  disabled?: string;
};

const PLANS: Plan[] = [
  {
    id: "limited_access_onetime",
    name: "Limited Access",
    price: "$10.99",
    tag: "One-time",
    features: [
      "Peptides research library",
      "Articles & studies",
      "Lifting programs & nutrition",
      "Supplies checklist",
      "Reconstitution guide",
      "Injection guide",
    ],
    disabled: "No custom protocols, My Stack, Calculator, or Pep Talk AI",
  },
  {
    id: "full_access_lifetime",
    name: "Full Access",
    price: "$59.99",
    tag: "Lifetime",
    features: [
      "Everything in Limited Access",
      "Custom peptide + training protocols",
      "My Stack dose tracker",
      "Peptide dose calculator",
      "Pep Talk AI assistant",
      "Lifetime access, one payment",
    ],
  },
];

function CheckoutPage() {
  const { user, loading } = useAuth();
  const { tier, loading: accessLoading } = useAccess();
  const nav = useNavigate();
  const [selected, setSelected] = useState<Plan["id"] | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!accessLoading && tier === "full") nav({ to: "/dashboard" });
  }, [accessLoading, tier, nav]);

  if (loading || !user) {
    return <div className="min-h-dvh bg-background flex items-center justify-center text-eyebrow">Loading…</div>;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <PaymentTestModeBanner />
      <SiteHeader />
      <section className="container-edge py-12 sm:py-20 flex-1">
        <div className="text-eyebrow">Get Access</div>
        <h1 className="mt-4 text-4xl sm:text-6xl">Unlock the dashboard.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Choose your tier. One payment — no subscriptions.
          {tier === "limited" && " You currently have Limited Access. Upgrade to Full for the complete toolkit."}
        </p>

        {!selected && (
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {PLANS.map((p) => {
              const isCurrent = tier === "limited" && p.id === "limited_access_onetime";
              return (
                <div key={p.id} className="border border-foreground/15 p-6 sm:p-8 flex flex-col">
                  <div className="text-eyebrow text-blood">{p.tag}</div>
                  <div className="mt-2 font-display text-3xl">{p.name}</div>
                  <div className="mt-2 text-5xl font-display">{p.price}</div>
                  <ul className="mt-6 space-y-2 text-sm flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check size={16} className="text-blood shrink-0 mt-1" /> <span>{f}</span>
                      </li>
                    ))}
                    {p.disabled && (
                      <li className="text-muted-foreground text-xs mt-3 italic">{p.disabled}</li>
                    )}
                  </ul>
                  <button
                    disabled={isCurrent}
                    onClick={() => setSelected(p.id)}
                    className={`mt-6 ${isCurrent ? "btn-ghost opacity-50 cursor-not-allowed" : "btn-blood hover:btn-blood-hover"}`}
                  >
                    {isCurrent ? "Current plan" : `Select ${p.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mt-10">
            <button
              onClick={() => setSelected(null)}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-blood mb-6"
            >
              ← Choose a different plan
            </button>
            <div className="border border-foreground/15 bg-card">
              <StripeEmbeddedCheckoutForm priceId={selected} />
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Questions? <Link to="/contact" className="underline">Contact us</Link>.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
