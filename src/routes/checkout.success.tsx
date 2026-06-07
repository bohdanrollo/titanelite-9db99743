import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Check, ArrowRight } from "lucide-react";

type Search = { session_id?: string };

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [
      { title: "Payment Confirmed — Titan Elite" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: Success,
});

function Success() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-24 max-w-2xl">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-blood text-bone mb-8">
          <Check size={32} strokeWidth={1.5} />
        </div>
        <div className="text-eyebrow">Confirmed</div>
        <h1 className="mt-4 text-5xl lg:text-7xl">Payment received.</h1>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          Your intake is now in the review queue. Your coach will draft your custom protocol within
          48 hours and deliver it to your dashboard. You'll get an email the moment it's ready.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/dashboard" className="btn-blood hover:btn-blood-hover">
            Go to dashboard <ArrowRight size={14} />
          </Link>
          <Link to="/" className="btn-ghost hover:bg-foreground hover:text-background">
            Back to home
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
