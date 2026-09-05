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
      { name: "description", content: "Subscribe to the Titan Elite client dashboard: peptide research, calculators, protocols, and more." },
      { property: "og:title", content: "Get Access — Titan Elite" },
      { property: "og:description", content: "Subscribe to the Titan Elite client dashboard." },
    ],
  }),
  component: CheckoutPage,
});

type PlanId = "limited_monthly" | "full_monthly";
type Plan = {
  id: PlanId;
  name: string;
  price: string;
  tag: string;
  features: string[];
  disabled?: string;
};

const PLANS: Plan[] = [
  {
    id: "limited_monthly",
    name: "Limited Access",
    price: "$10.99",
    tag: "Per month",
    features: [
      "Full client dashboard access",
      "Peptides research library",
      "Dosing Guide with ranges & schedules",

      "Combos, Myths, Learning center",
      "My Stack dose tracker",
      "Peptide dose calculator",
      "Blood panel Lab Analysis",
      "Calorie & macro tracker",
      "Pep Talk AI assistant",
      "Lifting programs & nutrition",
      "Supplies, reconstitution, injection guides",
      "AI Stack Builder",
      "Progress, workout & wellness trackers",
    ],
    disabled: "Does NOT include custom protocols or direct coach messaging",
  },
  {
    id: "full_monthly",
    name: "Full Access",
    price: "$69.99",
    tag: "Per month",
    features: [
      "Everything in Limited Access",
      "Custom peptide + training protocols",
      "Direct messaging with your coach",
      "Book 30-minute coach calls",
      "One-on-one intake review",
      "Cancel anytime",
    ],
  },
];

function CheckoutPage() {
  const { user, loading } = useAuth();
  const { tier, loading: accessLoading } = useAccess();
  const nav = useNavigate();
  const [selected, setSelected] = useState<PlanId | null>(null);

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
        <h1 className="mt-4 text-4xl sm:text-6xl">
          {tier === "limited" ? "Upgrade your access." : "Unlock the dashboard."}
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          {tier === "limited"
            ? "You currently have Limited Access. Upgrade to Full Access for custom protocols — $69.99/month. Cancel anytime."
            : "Choose your plan. Promo codes supported at checkout. Cancel anytime."}
        </p>

        {!selected && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <div key={p.id} className="border border-foreground/15 p-6 sm:p-8 flex flex-col">
                <div className="text-eyebrow text-blood">{p.tag}</div>
                <div className="mt-2 font-display text-3xl">{p.name}</div>
                <div className="mt-2 text-4xl font-display">{p.price}</div>
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
                  onClick={() => setSelected(p.id)}
                  className="mt-6 btn-blood hover:btn-blood-hover"
                >
                  Select {p.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="mt-10">
            <button
              onClick={() => setSelected(null)}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-blood mb-6"
            >
              ← Back
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
