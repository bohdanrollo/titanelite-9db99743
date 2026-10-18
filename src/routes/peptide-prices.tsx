import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { publicPriceSamples } from "@/lib/pephub-inventory.functions";

const TITLE = "Peptide Prices — Compare Trusted Vendors | PepLog PepHub";
const DESC = "See sample peptide prices from trusted vendors tracked by PepHub. Join free to compare every listing, price per mg and stock.";
const URL = "https://peplog.io/peptide-prices";

export const Route = createFileRoute("/peptide-prices")({
  loader: () => publicPriceSamples().catch(() => []),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Page,
});

function Page() {
  const rows = Route.useLoaderData();
  return (
    <div className="landing-light min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="container-edge py-16">
          <div className="text-eyebrow">PepHub</div>
          <h1 className="mt-4 font-landing text-4xl font-semibold sm:text-6xl">Peptide price comparison</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            PepHub tracks prices and stock across trusted peptide vendors throughout the day. Here's a sample of the
            lowest in-stock prices right now.
          </p>
        </section>
        <section className="container-edge pb-12">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">Sample prices are refreshing. Join PepHub to see every listing.</p>
          ) : (
            <div className="max-w-3xl overflow-x-auto rounded-2xl border border-foreground/10 bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-foreground/10">
                    <th className="p-4 font-medium">Compound</th>
                    <th className="p-4 font-medium">Lowest price</th>
                    <th className="p-4 font-medium">Vendor</th>
                    <th className="p-4 font-medium">Vendors tracked</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.compound} className="border-b border-foreground/5 last:border-0">
                      <td className="p-4 font-medium">{r.compound}{r.strength ? <span className="text-muted-foreground"> · {r.strength}</span> : null}</td>
                      <td className="p-4">${r.price.toFixed(2)}</td>
                      <td className="p-4">{r.vendor}</td>
                      <td className="p-4">{r.vendorCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="container-edge pb-12">
          <div className="max-w-3xl rounded-2xl border border-foreground/10 bg-card p-7 shadow-sm">
            <h2 className="font-landing text-2xl font-semibold">See the full comparison free</h2>
            <p className="mt-3 text-muted-foreground">
              Create a free account and join PepHub to compare every listing, price per mg, stock, price history and sale alerts.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/auth" className="landing-btn-primary">Create free account</Link>
              <Link to="/pephub" className="landing-btn-secondary">Explore PepHub</Link>
            </div>
          </div>
        </section>
        <section className="container-edge pb-16 max-w-3xl space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="font-landing text-2xl font-semibold text-foreground">How PepHub compares prices</h2>
          <p>Prices come from each vendor's store and refresh throughout the day. Compare by price per mg, since vial sizes vary between vendors.</p>
          <p className="text-sm">Prices can change at any time. For educational research reference only.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
