import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import PepHubInventoryInsights from "@/components/PepHubInventoryInsights";
import { adminInvVendors, adminInvUpdateVendor, adminInvSyncNow } from "@/lib/pephub-inventory.functions";

type Vendor = Awaited<ReturnType<typeof adminInvVendors>>["vendors"][number];

function ago(iso: string | null) {
  if (!iso) return "Never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 2880) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export default function PepHubInventoryAdmin() {
  const list = useServerFn(adminInvVendors);
  const update = useServerFn(adminInvUpdateVendor);
  const sync = useServerFn(adminInvSyncNow);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setVendors((await list({ data: undefined })).vendors); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [list]);
  useEffect(() => { void load(); }, [load]);

  async function patch(id: string, data: { tracking?: boolean; feedUrl?: string; hours?: number }) {
    try { await update({ data: { id, ...data } }); await load(); toast.success("Saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  }

  async function runSync(v: Vendor) {
    setSyncing(v.id);
    try {
      const r = await sync({ data: { id: v.id } });
      if (r.status === "success") toast.success(`${v.name}: ${r.added} added · ${r.updated} updated · ${r.priceChanges} price changes · ${r.deactivated} removed`);
      else toast.error(`${v.name}: ${r.error}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Sync failed"); }
    finally { setSyncing(null); }
  }

  const tracked = vendors.filter((v) => v.inventory_tracking_enabled);
  const stat = (l: string, v: number | string) => (
    <div className="rounded-xl border border-foreground/10 bg-card p-4"><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{l}</div><div className="mt-1 text-2xl">{v}</div></div>
  );

  if (loading) return <div className="mt-6 text-sm text-muted-foreground">Loading inventory…</div>;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Vendors tracked", tracked.length)}
        {stat("Products", tracked.reduce((a, v) => a + v.total, 0))}
        {stat("In stock", tracked.reduce((a, v) => a + v.inStock, 0))}
        {stat("Sync errors", tracked.filter((v) => v.inventory_sync_status === "failed").length)}
      </div>
      <p className="text-xs text-muted-foreground">
        Tracked vendors sync automatically (default every 6 hours). PepHub reads Shopify and WooCommerce catalogs on its own; for other stores, paste a JSON product feed URL.
      </p>
      <div className="space-y-3">
        {vendors.map((v) => (
          <div key={v.id} className="rounded-xl border border-foreground/10 bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{v.name} {!v.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {v.total} products · {v.inStock} in stock · {v.unmatched} unmatched · Last sync {ago(v.last_inventory_sync)} ·{" "}
                  <span className={v.inventory_sync_status === "failed" ? "text-destructive" : v.inventory_sync_status === "success" ? "text-blood" : ""}>{v.inventory_sync_status.toUpperCase()}</span>
                </div>
                {v.inventory_sync_error && <div className="mt-1 text-xs text-destructive">{v.inventory_sync_error}</div>}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.inventory_tracking_enabled} onChange={(e) => patch(v.id, { tracking: e.target.checked })} />
                  Track inventory
                </label>
                <button disabled={syncing !== null} onClick={() => runSync(v)} className="inline-flex items-center gap-1.5 rounded-full bg-blood px-3 py-1.5 text-xs text-bone disabled:opacity-50">
                  {syncing === v.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync now
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input defaultValue={v.inventory_feed_url ?? ""} placeholder="Optional product feed URL (JSON)" onBlur={(e) => e.target.value !== (v.inventory_feed_url ?? "") && patch(v.id, { feedUrl: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-xs" />
              <select defaultValue={v.inventory_sync_hours} onChange={(e) => patch(v.id, { hours: Number(e.target.value) })} className="rounded-lg border border-foreground/15 bg-background px-2 py-1.5 text-xs">
                {[3, 6, 12, 24].map((h) => <option key={h} value={h}>Every {h}h</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      <PepHubInventoryInsights />
    </div>
  );
}
