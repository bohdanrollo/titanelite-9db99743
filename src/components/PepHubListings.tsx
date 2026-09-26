import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { invTrackClick, type InvListing } from "@/lib/pephub-inventory.functions";

type Sort = "price-asc" | "price-desc" | "ppm" | "vendor" | "stock" | "recent";

export function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 2880) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}
const money = (n: number | null) => (n == null ? "Data unavailable" : `$${n.toFixed(2)}`);

function Stock({ v }: { v: boolean | null }) {
  if (v == null) return <span className="text-xs text-muted-foreground">Stock unknown</span>;
  return <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${v ? "text-blood" : "text-muted-foreground"}`}>{v ? "In stock" : "Out of stock"}</span>;
}

export function PepHubListings({ listings }: { listings: InvListing[] }) {
  const track = useServerFn(invTrackClick);
  const onClick = (id: string) => { void track({ data: { productId: id } }).catch(() => {}); };
  const [sort, setSort] = useState<Sort>("price-asc");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [vendor, setVendor] = useState("");
  const [strength, setStrength] = useState("");
  const vendors = useMemo(() => [...new Set(listings.map((l) => l.vendorName))].sort(), [listings]);
  const strengths = useMemo(() => [...new Set(listings.map((l) => l.strength).filter(Boolean) as string[])].sort((a, b) => parseFloat(a) - parseFloat(b)), [listings]);

  const rows = useMemo(() => {
    const r = listings.filter((l) => (!inStockOnly || l.inStock) && (!vendor || l.vendorName === vendor) && (!strength || l.strength === strength));
    const nil = (n: number | null, hi = true) => n ?? (hi ? Infinity : -Infinity);
    r.sort((a, b) => {
      switch (sort) {
        case "price-asc": return nil(a.price) - nil(b.price);
        case "price-desc": return nil(b.price, false) - nil(a.price, false);
        case "ppm": return nil(a.pricePerMg) - nil(b.pricePerMg);
        case "vendor": return a.vendorName.localeCompare(b.vendorName);
        case "stock": return Number(b.inStock ?? false) - Number(a.inStock ?? false);
        case "recent": return b.lastChecked.localeCompare(a.lastChecked);
      }
    });
    return r;
  }, [listings, sort, inStockOnly, vendor, strength]);

  const sel = "rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm";
  const name = (l: InvListing) => [l.productName, l.variantName].filter(Boolean).join(" — ");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={sel} aria-label="Sort">
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="ppm">Price per mg</option>
          <option value="vendor">Vendor</option>
          <option value="stock">In stock first</option>
          <option value="recent">Recently updated</option>
        </select>
        <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={sel} aria-label="Vendor">
          <option value="">All vendors</option>
          {vendors.map((v) => <option key={v}>{v}</option>)}
        </select>
        {strengths.length > 1 && (
          <select value={strength} onChange={(e) => setStrength(e.target.value)} className={sel} aria-label="Strength">
            <option value="">All strengths</option>
            {strengths.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /> Show only in-stock products</label>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} listings</span>
      </div>

      {/* Mobile cards */}
      <div className="mt-5 space-y-3 md:hidden">
        {rows.map((l) => (
          <div key={l.id} className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{l.vendorName}</div>
                <div className="mt-0.5 font-medium leading-snug">{name(l)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{l.strength ?? "Strength unavailable"}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-medium">{money(l.price)}</div>
                {l.previousPrice && <div className="text-[10px] uppercase text-blood">Dropped from {money(l.previousPrice)}</div>}
                {l.originalPrice && <div className="text-xs text-muted-foreground line-through">{money(l.originalPrice)}</div>}
                {l.pricePerMg && <div className="text-xs text-muted-foreground">${l.pricePerMg.toFixed(2)}/mg</div>}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-col"><Stock v={l.inStock} /><span className="text-[11px] text-muted-foreground">Last checked {timeAgo(l.lastChecked)}</span></div>
              {l.url && <a onClick={() => onClick(l.id)} href={l.url} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex items-center gap-1.5 rounded-full bg-blood px-4 py-2 text-xs text-bone">View product <ExternalLink size={12} /></a>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="mt-5 hidden overflow-hidden rounded-xl border border-foreground/10 bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-foreground/[0.03] text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr><th className="p-3">Vendor</th><th className="p-3">Product</th><th className="p-3">Strength</th><th className="p-3">Price</th><th className="p-3">$/mg</th><th className="p-3">Stock</th><th className="p-3">Checked</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-foreground/10">
                <td className="p-3 font-medium">{l.vendorName}</td>
                <td className="p-3">{name(l)}</td>
                <td className="p-3 text-muted-foreground">{l.strength ?? "—"}</td>
                <td className="p-3">
                  <span className="font-medium">{money(l.price)}</span>{l.previousPrice && <span className="ml-2 rounded bg-blood/10 px-1.5 py-0.5 text-[10px] uppercase text-blood">Price drop from {money(l.previousPrice)}</span>}
                  {l.originalPrice && <><span className="ml-2 text-xs text-muted-foreground line-through">{money(l.originalPrice)}</span><span className="ml-2 rounded bg-blood/10 px-1.5 py-0.5 text-[10px] uppercase text-blood">Sale</span></>}
                </td>
                <td className="p-3 text-muted-foreground">{l.pricePerMg ? `$${l.pricePerMg.toFixed(2)}` : "—"}</td>
                <td className="p-3"><Stock v={l.inStock} /></td>
                <td className="p-3 text-xs text-muted-foreground">{timeAgo(l.lastChecked)}</td>
                <td className="p-3 text-right">{l.url && <a onClick={() => onClick(l.id)} href={l.url} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex items-center gap-1.5 rounded-full bg-blood px-3 py-1.5 text-xs text-bone">View <ExternalLink size={11} /></a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="mt-5 rounded-xl border border-foreground/10 bg-card p-6 text-sm text-muted-foreground">No listings match these filters.</div>}
    </div>
  );
}

export function PepHubDisclosure() {
  return (
    <div className="mt-12 space-y-2 border-t border-foreground/10 pt-6 text-xs leading-relaxed text-muted-foreground">
      <p>PepHub is an independent comparison and discovery platform. Product information, pricing, availability, and descriptions are provided by or collected from third-party vendors and may change at any time. Always confirm details on the vendor's site.</p>
      <p>PepHub may receive compensation from qualifying purchases made through affiliate links. This does not change the price paid by the user.</p>
      <p>Products listed are designated by their vendors as research-use-only and are not intended for human or animal consumption.</p>
    </div>
  );
}
