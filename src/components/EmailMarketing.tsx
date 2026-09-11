import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Upload } from "lucide-react";
import {
  adminMarketingOverview,
  adminMigrationPreview,
  adminSyncResend,
  type MarketingSubscriber,
  type SyncReport,
} from "@/lib/marketing.functions";

type Stats = {
  total: number;
  subscribed: number;
  unsubscribed: number;
  today: number;
  week: number;
  month: number;
  synced: number;
  pending: number;
  failed: number;
  notMigrated: number;
  lastSync?: string;
};

export default function EmailMarketing() {
  const [rows, setRows] = useState<MarketingSubscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [preview, setPreview] = useState<{
    legacyRecords: number;
    preservedRecords: number;
    readyToMigrate: number;
  } | null>(null);
  const [busy, setBusy] = useState<"sync" | "migrate" | null>(null);
  const [report, setReport] = useState<{ title: string; data: SyncReport } | null>(null);
  const [query, setQuery] = useState("");

  const overview = useServerFn(adminMarketingOverview);
  const previewFn = useServerFn(adminMigrationPreview);
  const sync = useServerFn(adminSyncResend);

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([overview({}), previewFn({})]);
      setRows(o.subscribers);
      setStats(o.stats as Stats);
      setPreview(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load subscribers");
    }
  }, [overview, previewFn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(mode: "all" | "pending", label: "sync" | "migrate") {
    setBusy(label);
    setReport(null);
    try {
      const res = await sync({ data: { mode } });
      setReport({ title: label === "sync" ? "Sync complete" : "Migration complete", data: res });
      toast.success(label === "sync" ? "Resend sync finished" : "Migration finished");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const filtered = rows.filter((r) =>
    query.trim() ? r.email.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl">Email marketing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One subscriber list, synced to your Resend audience for broadcasts.
        </p>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Total subscribers" value={stats.total} />
          <Stat label="Subscribed" value={stats.subscribed} />
          <Stat label="Unsubscribed" value={stats.unsubscribed} />
          <Stat label="New today" value={stats.today} />
          <Stat label="New this week" value={stats.week} />
          <Stat label="New this month" value={stats.month} />
          <Stat label="Synced to Resend" value={stats.synced} />
          <Stat label="Pending sync" value={stats.pending} />
          <Stat label="Sync failures" value={stats.failed} />
          <Stat
            label="Last sync"
            value={stats.lastSync ? new Date(stats.lastSync).toLocaleString() : "Never"}
          />
        </div>
      )}

      <div className="rounded-2xl border border-foreground/10 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {preview
              ? `${preview.readyToMigrate} existing subscribers are ready to migrate to Resend. ${preview.preservedRecords} records preserved (${preview.legacyRecords} in the original list, untouched).`
              : "Loading migration status…"}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy !== null}
              onClick={() => run("pending", "migrate")}
            >
              <Upload size={14} className="mr-2" />
              {busy === "migrate" ? "Migrating…" : "Migrate to Resend"}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy !== null}
              onClick={() => run("all", "sync")}
            >
              <RefreshCw size={14} className="mr-2" />
              {busy === "sync" ? "Syncing…" : "Sync Resend"}
            </button>
          </div>
        </div>

        {report && (
          <div className="mt-4 rounded-xl border border-foreground/10 bg-background p-4 text-sm">
            <div className="font-semibold">{report.title}</div>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>{report.data.processed} processed</li>
              <li>{report.data.added} added</li>
              <li>{report.data.updated} updated</li>
              <li>{report.data.alreadySynced} already synced</li>
              <li>{report.data.skippedOptOut} skipped (opted out)</li>
              <li>{report.data.failed} failed</li>
              <li>0 duplicates created · 0 records deleted</li>
            </ul>
            {report.data.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-blood">
                {report.data.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-card p-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email"
          className="mb-4 w-full max-w-sm rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-blood"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">First</th>
                <th className="py-2 pr-4">Last</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Signed up</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Resend contact</th>
                <th className="py-2 pr-4">Sync</th>
                <th className="py-2 pr-4">Last synced</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((r) => (
                <tr key={r.id} className="border-t border-foreground/10">
                  <td className="py-2 pr-4">{r.email}</td>
                  <td className="py-2 pr-4">{r.first_name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.last_name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.source}</td>
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">{r.subscribed ? "Subscribed" : "Unsubscribed"}</td>
                  <td className="py-2 pr-4 font-mono text-[11px]">
                    {r.resend_contact_id ? r.resend_contact_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="py-2 pr-4">{r.resend_sync_status}</td>
                  <td className="py-2 pr-4">
                    {r.resend_last_synced_at
                      ? new Date(r.resend_last_synced_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">No subscribers yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
