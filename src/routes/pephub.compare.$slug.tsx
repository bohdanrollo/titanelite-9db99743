import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PepHubListings, PepHubDisclosure } from "@/components/PepHubListings";
import { MembersOnly } from "@/routes/pephub.inventory";
import { invCompound, type InvListing } from "@/lib/pephub-inventory.functions";

export const Route = createFileRoute("/pephub/compare/$slug")({
  head: () => ({
    meta: [
      { title: "Compare Vendor Prices | PepHub" },
      { name: "description", content: "Compare prices, strengths and stock for this compound across PepHub's trusted vendors." },
      { property: "og:title", content: "Compare Vendor Prices | PepHub" },
      { property: "og:description", content: "Live price and stock comparison across trusted PepHub vendors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { slug } = Route.useParams();
  const load = useServerFn(invCompound);
  const [state, setState] = useState<"loading" | "locked" | "ready">("loading");
  const [compound, setCompound] = useState<{ name: string; category: string | null } | null>(null);
  const [listings, setListings] = useState<InvListing[]>([]);

  useEffect(() => {
    setState("loading");
    load({ data: { slug } })
      .then((r) => { setCompound(r.compound); setListings(r.listings); setState("ready"); })
      .catch(() => setState("locked"));
  }, [slug, load]);

  const prices = listings.map((l) => l.price).filter((p): p is number => p != null);
  const vendorCount = new Set(listings.map((l) => l.vendorId)).size;
  const strengths = new Set(listings.map((l) => l.strength).filter(Boolean)).size;

  return (
    <div className="landing-light min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />
      <section className="container-edge flex-1 py-10 lg:py-14">
        <Link to="/pephub/inventory" className="text-eyebrow">← Inventory</Link>
        {state === "loading" && <div className="mt-8 text-sm text-muted-foreground">Loading…</div>}
        {state === "locked" && <MembersOnly />}
        {state === "ready" && !compound && <div className="mt-8 text-muted-foreground">Compound not found.</div>}
        {state === "ready" && compound && (
          <>
            <h1 className="mt-4 text-4xl sm:text-5xl">{compound.name}</h1>
            <p className="mt-3 text-muted-foreground">Compare available PepHub vendors</p>
            <div className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["Vendors", String(vendorCount)],
                ["Price range", prices.length ? `$${Math.min(...prices).toFixed(0)}–$${Math.max(...prices).toFixed(0)}` : "—"],
                ["Strengths", String(strengths)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-foreground/10 bg-card p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l}</div>
                  <div className="mt-1 text-xl">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              {listings.length ? <PepHubListings listings={listings} /> : <div className="text-sm text-muted-foreground">No vendors currently list this compound.</div>}
            </div>
            <PepHubDisclosure />
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
