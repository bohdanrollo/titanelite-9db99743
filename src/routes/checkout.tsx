import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { STRIPE_PRICES, type TierId } from "@/lib/stripe-config";
import { useAuth } from "@/lib/auth";

type CheckoutSearch = { plan?: string; intake?: string };

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Titan Elite Coaching" },
      { name: "description", content: "Select your Titan Elite coaching package and proceed to payment." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): CheckoutSearch => ({
    plan: typeof s.plan === "string" ? s.plan : undefined,
    intake: typeof s.intake === "string" ? s.intake : undefined,
  }),
  component: Checkout,
});

function Checkout() {
  const { plan, intake } = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const checkoutFn = useServerFn(createCheckoutSession);
  const [busy, setBusy] = useState<TierId | null>(null);

  async function startCheckout(tier: TierId) {
    if (!user) {
      toast.info("Sign in to continue.");
      nav({ to: "/auth" });
      return;
    }
    setBusy(tier);
    try {
      const { url } = await checkoutFn({
        data: { tier, intakeId: intake, origin: window.location.origin },
      });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start checkout";
      toast.error(msg);
      setBusy(null);
    }
  }

  const tiers: { n: TierId; d: string; b: string[]; h?: boolean }[] = [
    { n: "Foundation", d: "For lifters establishing a base.", b: ["4-week training block", "Educational peptide notes", "Email support", "One-time program delivery"] },
    { n: "Elite", d: "Most clients start here.", h: true, b: ["Full custom programming", "Custom peptide protocol", "Weekly check-ins", "Direct messaging", "Progress tracking dashboard"] },
    { n: "Apex", d: "For competitors and committed long-cycle clients.", b: ["Monthly programming reset", "Bloodwork review (educational)", "Bi-weekly video call", "Priority access & messaging", "Custom recovery & nutrition guidance"] },
  ];

  const fromIntake = !!plan;
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const formatPer = (mode: "payment" | "subscription") => mode === "payment" ? "one-time" : "/ month";

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20">
        <div className="text-eyebrow">Checkout</div>
        <h1 className="mt-4 text-6xl lg:text-8xl">
          {fromIntake ? "Complete payment." : "Select your tier."}
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground">
          {fromIntake
            ? `Your intake is saved. Pay for the ${plan} plan below to finalize your submission.`
            : "All transactions are processed securely via Stripe."}
        </p>
      </section>

      <section className="container-edge pb-24">
        <div className="grid md:grid-cols-3 gap-px bg-foreground/15">
          {tiers.map((t) => {
            const cfg = STRIPE_PRICES[t.n];
            const isSelected = plan === t.n;
            return (
              <div key={t.n} className={`p-10 ${t.h ? "bg-ink text-bone" : "bg-background"} ${isSelected ? "ring-2 ring-blood ring-inset" : ""}`}>
                {t.h && <div className="text-blood font-mono text-[10px] uppercase tracking-[0.18em] mb-4">Most Selected</div>}
                {isSelected && !t.h && <div className="text-blood font-mono text-[10px] uppercase tracking-[0.18em] mb-4">Your Plan</div>}
                <div className="font-display text-4xl">{t.n}</div>
                <p className={`mt-2 text-sm ${t.h ? "text-bone/70" : "text-muted-foreground"}`}>{t.d}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-6xl">{formatPrice(cfg.amountCents)}</span>
                  <span className="font-mono text-xs uppercase tracking-wider opacity-60">{formatPer(cfg.mode)}</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm">
                  {t.b.map((x) => (
                    <li key={x} className="flex gap-2"><Check size={16} className="text-blood shrink-0 mt-0.5" /><span>{x}</span></li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(t.n)}
                  disabled={busy !== null}
                  className={`mt-10 inline-flex disabled:opacity-50 ${t.h ? "btn-blood hover:btn-blood-hover" : "btn-ghost hover:bg-foreground hover:text-background"}`}
                >
                  {busy === t.n ? <><Loader2 className="animate-spin" size={14} /> Redirecting…</> : <>Pay with Stripe <ArrowRight size={14} /></>}
                </button>
              </div>
            );
          })}
        </div>
        {!user && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="text-blood underline">Sign in</Link> before checkout to link your purchase to your account.
          </p>
        )}
        <p className="mt-10 text-center text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Secure payment by Stripe. Educational content only — not medical advice.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
