import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCw } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAccess } from "@/lib/access";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment complete — Titan Elite" }] }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: ReturnPage,
});

const MAX_TRIES = 10;

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const { tier, refresh } = useAccess();
  const [tries, setTries] = useState(0);
  const [round, setRound] = useState(0);
  const activated = tier === "limited" || tier === "full";
  const stalled = !activated && tries >= MAX_TRIES;

  // Poll for the webhook to activate access. Ceiling ~20s per round.
  useEffect(() => {
    if (activated) return;
    if (tries >= MAX_TRIES) return;
    const t = setTimeout(() => {
      refresh();
      setTries((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [activated, tries, refresh]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SiteHeader />
      <section className="container-edge py-24 flex-1 text-center max-w-xl mx-auto">
        {activated ? (
          <>
            <CheckCircle2 size={56} className="mx-auto text-blood" />
            <div className="text-eyebrow mt-6">Access activated</div>
            <h1 className="mt-4 text-4xl sm:text-6xl">You're in.</h1>
            <p className="mt-4 text-muted-foreground">
              Your {tier === "full" ? "Full Access" : "Limited Access"} is live. Head to the dashboard.
            </p>
            <Link to="/dashboard" className="mt-8 inline-flex btn-blood hover:btn-blood-hover">
              Open dashboard
            </Link>
          </>
        ) : stalled ? (
          <>
            <AlertTriangle size={56} className="mx-auto text-blood" />
            <div className="text-eyebrow mt-6">Payment received</div>
            <h1 className="mt-4 text-4xl sm:text-5xl">Access is taking longer than usual.</h1>
            <p className="mt-4 text-muted-foreground">
              Your payment went through — nothing was charged twice and you don't need to pay again.
              Activation happens automatically once our payment provider confirms the charge, which
              can occasionally take a few minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  setTries(0);
                  setRound((r) => r + 1);
                  refresh();
                }}
                className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2"
              >
                <RotateCw size={15} /> Check again
              </button>
              <Link to="/dashboard" className="btn-ghost inline-flex items-center">
                Go to dashboard
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Still locked after a few minutes?{" "}
              <Link to="/contact" className="underline">
                Contact us
              </Link>{" "}
              with the reference below and we'll activate it manually.
            </p>
            {session_id && (
              <p className="mt-3 text-xs text-muted-foreground font-mono break-all">
                Reference: {session_id}
              </p>
            )}
            {round >= 2 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Tip: signing out and back in refreshes your access after activation completes.
              </p>
            )}
          </>
        ) : (
          <>
            <Loader2 size={56} className="mx-auto text-blood animate-spin" />
            <div className="text-eyebrow mt-6">Payment received</div>
            <h1 className="mt-4 text-4xl sm:text-6xl">Activating access…</h1>
            <p className="mt-4 text-muted-foreground">
              This usually takes a few seconds. Keep this page open — it updates automatically.
            </p>
            <Link to="/dashboard" className="mt-8 inline-flex btn-ghost">
              Go to dashboard
            </Link>
            {session_id && (
              <p className="mt-6 text-xs text-muted-foreground font-mono">
                Reference: {session_id.slice(0, 20)}…
              </p>
            )}
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

