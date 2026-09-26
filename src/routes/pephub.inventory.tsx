import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PepHubListings, PepHubDisclosure, timeAgo } from "@/components/PepHubListings";
import { invOverview, invSearch, type InvCompound, type InvListing } from "@/lib/pephub-inventory.functions";

export const Route = createFileRoute("/pephub/inventory")({
  head: () => ({
    meta: [
      { title: "PepHub Inventory — Compare Peptide Prices | PepLog" },
      { name: "description", content: "Search compounds and compare live prices and stock across PepHub's trusted vendors." },
      { property: "og:title", content: "PepHub Inventory — Compare Peptide Prices" },
      { property: "og:description", content: "Search a compound and compare prices, strengths and stock across trusted PepHub vendors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

export function MembersOnly() {
  return (
    <div className="mt-10 max-w-xl rounded-2xl border border-foreground/10 bg-card p-7 shadow-sm">
      <h2 className="text-2xl">PepHub members only</h2>
      <p className="mt-3 text-sm text-muted-foreground">Price comparison is free for PepHub members. Create an account and join the sale-alert list to unlock it.</p>
      <Link to="/pephub" className="mt-5 inline-flex rounded-full bg-blood px-5 py-2.5 text-sm text-bone">Join PepHub</Link>
    </div>
  );
}

function InventoryPage() {
  const overview = useServerFn(invOverview);
  const search = useServerFn(invSearch);
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "locked" | "ready">("loading");
  const [compounds, setCompounds] = useState<InvCompound[]>([]);
  const [recent, setRecent] = useState<InvListing[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ compounds: InvCompound[]; listings: InvListing[] } | null>(null);

  useEffect(() => {
    overview({ data: undefined })
      .then((r) => { setCompounds(r.compounds); setRecent(r.recent); setTotal(r.totalProducts); setState("ready"); })
      .catch(() => setState("locked"));
  }, [overview]);

  useEffect(() => {
    if (state !== "ready") return;
    const term = q.trim();
    if (!term) { setResults(null); return; }
    const t = setTimeout(() => { search({ data: { q: term } }).then(setResults).catch(() => setResults({ compounds: [], listings: [] })); }, 200);
    return () => clearTimeout(t);
  }, [q, state, search]);

  const suggestions = q.trim()
    ? compounds.filter((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(q.toLowerCase().replace(/[^a-z0-9]/g, ""))).slice(0, 6)
    : [];

  return (
    <div className="landing-light min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />
      <section className="container-edge flex-1 py-10 lg:py-14">
        <Link to="/pephub" className="text-eyebrow">← PepHub</Link>
        <h1 className="mt-4 text-4xl sm:text-5xl">PepHub Inventory</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Compare prices, strengths and stock across our trusted vendors. Prices are pulled from each vendor's store and refreshed throughout the day.</p>

        {state === "loading" && <div className="mt-10 text-sm text-muted-foreground">Loading inventory…</div>}
        {state === "locked" && <MembersOnly />}
        {state === "ready" && (
          <>
            <div className="relative mt-8 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && suggestions[0]) navigate({ to: "/pephub/compare/$slug", params: { slug: suggestions[0].slug } }); }}
                placeholder={`Search peptides, compounds, or products${total ? ` (${total} listings)` : ""}…`}
                className="w-full rounded-2xl border border-foreground/15 bg-card py-4 pl-12 pr-4 text-base shadow-sm outline-none focus:border-blood" />
              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-foreground/10 bg-card shadow-lg">
                  {suggestions.map((c) => (
                    <Link key={c.id} to="/pephub/compare/$slug" params={{ slug: c.slug }} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-foreground/5">
                      <span className="font-medium">{c.name}</span><span className="text-xs text-muted-foreground">{c.listings} listings</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {results ? (
              <div className="mt-10">
                <h2 className="text-xl">Results for “{q}”</h2>
                <div className="mt-4"><PepHubListings listings={results.listings} /></div>
              </div>
            ) : total === 0 ? (
              <div className="mt-10 rounded-xl border border-foreground/10 bg-card p-6 text-sm text-muted-foreground">Inventory is being collected from our vendors. Check back soon.</div>
            ) : (
              <>
                <div className="mt-10">
                  <div className="text-eyebrow">Popular compounds</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...compounds].sort((a, b) => (a.slug === "glp3-rt" ? -1 : b.slug === "glp3-rt" ? 1 : 0)).slice(0, 16).map((c) => (
                      <Link key={c.id} to="/pephub/compare/$slug" params={{ slug: c.slug }} className="rounded-full border border-foreground/15 bg-card px-4 py-2 text-sm hover:border-blood">
                        {c.name} <span className="text-muted-foreground">· {c.listings}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="mt-10">
                  <div className="text-eyebrow">Recently updated</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {recent.map((l) => (
                      <a key={l.id} href={l.url ?? "#"} target="_blank" rel="noopener noreferrer sponsored" className="rounded-xl border border-foreground/10 bg-card p-4 hover:border-blood">
                        <div className="text-xs text-muted-foreground">{l.vendorName}</div>
                        <div className="mt-1 line-clamp-2 text-sm font-medium">{l.productName}</div>
                        <div className="mt-2 flex items-center justify-between text-sm"><span>{l.price == null ? "Data unavailable" : `$${l.price.toFixed(2)}`}</span><span className="text-[11px] text-muted-foreground">{timeAgo(l.lastChecked)}</span></div>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
            <PepHubDisclosure />
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
