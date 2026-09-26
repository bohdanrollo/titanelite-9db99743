import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminInvUnmatched, adminInvMap, adminInvAnalytics } from "@/lib/pephub-inventory.functions";

type Unmatched = Awaited<ReturnType<typeof adminInvUnmatched>>;
type Analytics = Awaited<ReturnType<typeof adminInvAnalytics>>;

const card = "rounded-xl border border-foreground/10 bg-card p-4";
const label = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

function TopList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className={card}>
      <div className={label}>{title}</div>
      {rows.length ? (
        <ol className="mt-2 space-y-1 text-sm">
          {rows.map((r) => <li key={r.label} className="flex justify-between gap-3"><span className="truncate">{r.label}</span><span className="text-muted-foreground">{r.count}</span></li>)}
        </ol>
      ) : <div className="mt-2 text-sm text-muted-foreground">No data yet</div>}
    </div>
  );
}

export default function PepHubInventoryInsights() {
  const listUnmatched = useServerFn(adminInvUnmatched);
  const map = useServerFn(adminInvMap);
  const stats = useServerFn(adminInvAnalytics);
  const [u, setU] = useState<Unmatched | null>(null);
  const [a, setA] = useState<Analytics | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const [x, y] = await Promise.all([listUnmatched({ data: undefined }), stats({ data: undefined })]);
      setU(x); setA(y);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load"); }
  }, [listUnmatched, stats]);
  useEffect(() => { void load(); }, [load]);

  async function assign(productId: string, value: string) {
    if (!value) return;
    let payload: { productId: string; compoundId?: string; newCompound?: string };
    if (value === "__new") {
      const name = window.prompt("New compound name");
      if (!name?.trim()) return;
      payload = { productId, newCompound: name.trim() };
    } else payload = { productId, compoundId: value };
    try {
      await map({ data: payload });
      setU((prev) => prev && { ...prev, products: prev.products.filter((p) => p.id !== productId) });
      toast.success("Matched");
      if (value === "__new") void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Match failed"); }
  }

  const products = (u?.products ?? []).filter((p) => !filter || `${p.name} ${p.vendor}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="mt-10 space-y-8">
      <section>
        <h3 className="text-lg">Search & click activity (last 30 days)</h3>
        {!a ? <div className="mt-2 text-sm text-muted-foreground">Loading…</div> : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className={card}><div className={label}>Searches</div><div className="mt-1 text-2xl">{a.searchCount}</div></div>
            <div className={card}><div className={label}>Vendor clicks</div><div className="mt-1 text-2xl">{a.clickCount}</div></div>
            <TopList title="Top searches" rows={a.topSearches} />
            <TopList title="Most clicked products" rows={a.topProducts} />
            <TopList title="Most clicked vendors" rows={a.topVendors} />
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg">Unmatched products</h3>
            <p className="text-xs text-muted-foreground">Link each product to the right compound so it appears on comparison pages. Your choices are kept on future syncs.</p>
          </div>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-sm" />
        </div>
        {!u ? <div className="mt-2 text-sm text-muted-foreground">Loading…</div> : !products.length ? (
          <div className={`${card} mt-3 text-sm text-muted-foreground`}>Every product is matched.</div>
        ) : (
          <div className="mt-3 divide-y divide-foreground/10 rounded-xl border border-foreground/10 bg-card">
            {products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.vendor}{p.strength ? ` · ${p.strength}` : ""}</div>
                </div>
                <select defaultValue="" onChange={(e) => assign(p.id, e.target.value)} className="rounded-lg border border-foreground/15 bg-background px-2 py-1.5 text-xs">
                  <option value="">Assign compound…</option>
                  <option value="__new">+ New compound</option>
                  {u.compounds.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
