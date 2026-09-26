import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PepHubListings, PepHubDisclosure } from "@/components/PepHubListings";
import { MembersOnly } from "@/routes/pephub.inventory";
import { invCompound, type InvListing, type InvHistoryPoint } from "@/lib/pephub-inventory.functions";

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
  const [history, setHistory] = useState<InvHistoryPoint[]>([]);

  useEffect(() => {
    setState("loading");
    load({ data: { slug } })
      .then((r) => { setCompound(r.compound); setListings(r.listings); setHistory(r.history); setState("ready"); })
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
            <PriceHistory points={history} drops={listings.filter((l) => l.previousPrice).length} />
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

function PriceHistory({ points, drops }: { points: InvHistoryPoint[]; drops: number }) {
  if (points.length < 2) {
    return <p className="mt-6 text-xs text-muted-foreground">Price history builds up as PepHub checks vendors over time.{drops ? ` ${drops} recent price drop${drops > 1 ? "s" : ""}.` : ""}</p>;
  }
  const W = 600, H = 120, pad = 8;
  const vals = points.map((p) => p.low);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const xy = points.map((p, i) => [pad + (i / (points.length - 1)) * (W - 2 * pad), H - pad - ((p.low - min) / span) * (H - 2 * pad)]);
  const first = vals[0], last = vals[vals.length - 1];
  const change = ((last - first) / first) * 100;
  return (
    <div className="mt-6 max-w-2xl rounded-xl border border-foreground/10 bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Lowest price · last 90 days</div>
        <div className="text-xs text-muted-foreground">
          ${min.toFixed(2)} low · ${max.toFixed(2)} high · <span className={change < 0 ? "text-blood" : ""}>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
          {drops ? ` · ${drops} price drop${drops > 1 ? "s" : ""}` : ""}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Lowest price over time">
        <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" className="text-blood" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{points[0].day}</span><span>{points[points.length - 1].day}</span></div>
    </div>
  );
}
