import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment complete — Titan Elite" }] }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SiteHeader />
      <section className="container-edge py-24 flex-1 text-center max-w-xl mx-auto">
        <CheckCircle2 size={56} className="mx-auto text-blood" />
        <div className="text-eyebrow mt-6">Payment complete</div>
        <h1 className="mt-4 text-4xl sm:text-6xl">You're in.</h1>
        <p className="mt-4 text-muted-foreground">
          {session_id
            ? "Your access is being activated. Head to the dashboard to get started."
            : "Head to the dashboard to get started."}
        </p>
        <Link to="/dashboard" className="mt-8 inline-flex btn-blood hover:btn-blood-hover">
          Open dashboard
        </Link>
      </section>
      <SiteFooter />
    </div>
  );
}
