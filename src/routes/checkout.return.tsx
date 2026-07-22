import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const { tier, refresh } = useAccess();
  const [tries, setTries] = useState(0);
  const activated = tier === "limited" || tier === "full";

  // Poll for the webhook to activate access. Ceiling ~20s.
  useEffect(() => {
    if (activated) return;
    if (tries >= 10) return;
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
        ) : (
          <>
            <Loader2 size={56} className="mx-auto text-blood animate-spin" />
            <div className="text-eyebrow mt-6">Payment received</div>
            <h1 className="mt-4 text-4xl sm:text-6xl">Activating access…</h1>
            <p className="mt-4 text-muted-foreground">
              This usually takes a few seconds.
              {tries >= 10 && " Still working — try refreshing the dashboard in a minute."}
            </p>
            <Link to="/dashboard" className="mt-8 inline-flex btn-ghost">
              Go to dashboard
            </Link>
            {session_id && (
              <p className="mt-6 text-xs text-muted-foreground font-mono">Session: {session_id.slice(0, 20)}…</p>
            )}
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
