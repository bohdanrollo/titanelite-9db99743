import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Upload, Send, RotateCcw } from "lucide-react";
import {
  adminMarketingOverview,
  adminMigrationPreview,
  adminSyncResend,
  adminSendTestWelcome,
  adminWelcomeConfig,
  adminRetryPepHubWelcome,
  adminRetryTitanEliteWelcome,
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
  const [testEmail, setTestEmail] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [welcomeCfg, setWelcomeCfg] = useState<{
    broadcastId: string | null;
    name: string | null;
    subject: string | null;
    audienceConfigured: boolean;
    apiKeyConfigured: boolean;
  } | null>(null);

  const overview = useServerFn(adminMarketingOverview);
  const previewFn = useServerFn(adminMigrationPreview);
  const sync = useServerFn(adminSyncResend);
  const sendTest = useServerFn(adminSendTestWelcome);
  const welcomeConfig = useServerFn(adminWelcomeConfig);
  const retryPepHubWelcome = useServerFn(adminRetryPepHubWelcome);

  const load = useCallback(async () => {
    try {
      const [o, p, w] = await Promise.all([overview({}), previewFn({}), welcomeConfig({})]);
      setRows(o.subscribers);
      setStats(o.stats as Stats);
      setPreview(p);
      setWelcomeCfg(w);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load subscribers");
    }
  }, [overview, previewFn, welcomeConfig]);

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-semibold">Welcome email</div>
            <p className="mt-1 text-sm text-muted-foreground">
              New signups receive the exact content of your Resend broadcast
              {welcomeCfg?.name ? ` “${welcomeCfg.name}”` : ""}
              {welcomeCfg?.subject ? ` (subject: “${welcomeCfg.subject}”)` : ""}. It is delivered to
              that one person only — your list is never broadcast to on signup.
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Broadcast ID: {welcomeCfg?.broadcastId ?? "not configured"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-blood"
            />
            <button
              type="button"
              className="btn-primary"
              disabled={testBusy || !testEmail.trim()}
              onClick={async () => {
                setTestBusy(true);
                try {
                  const res = await sendTest({ data: { email: testEmail.trim(), force: true } });
                  if (res.outcome === "sent") toast.success(`Welcome email sent to ${testEmail}`);
                  else toast.error(`${res.outcome}${res.reason ? `: ${res.reason}` : ""}`);
                  await load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Test send failed");
                } finally {
                  setTestBusy(false);
                }
              }}
            >
              <Send size={14} className="mr-2" />
              {testBusy ? "Sending…" : "Send test welcome"}
            </button>
          </div>
        </div>
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
                <th className="py-2 pr-4">Welcome</th>
                <th className="py-2 pr-4">Welcome sent</th>
                <th className="py-2 pr-4">Broadcast</th>
                <th className="py-2 pr-4">Error</th>
                <th className="py-2 pr-4">PepHub automation</th>
                <th className="py-2 pr-4">Triggered</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Attempts</th>
                <th className="py-2 pr-4">Automation error</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Titan Elite automation</th>
                <th className="py-2 pr-4">Triggered</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Attempts</th>
                <th className="py-2 pr-4">Automation error</th>
                <th className="py-2 pr-4">Action</th>
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
                  <td className="py-2 pr-4">{r.welcome_email_status}</td>
                  <td className="py-2 pr-4">
                    {r.welcome_email_sent_at
                      ? new Date(r.welcome_email_sent_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-[11px]">
                    {r.welcome_broadcast_id ? r.welcome_broadcast_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="py-2 pr-4 max-w-[220px] truncate text-xs text-blood">
                    {r.welcome_email_error ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{r.pephub_welcome_status}</td>
                  <td className="py-2 pr-4">
                    {r.pephub_welcome_triggered_at
                      ? new Date(r.pephub_welcome_triggered_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-[11px]">
                    {r.pephub_welcome_event_name ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{r.pephub_welcome_attempts}</td>
                  <td className="py-2 pr-4 max-w-[220px] truncate text-xs text-blood">
                    {r.pephub_welcome_error ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {r.pephub_welcome_status === "failed" ? (
                      <button
                        type="button"
                        className="btn-primary whitespace-nowrap"
                        disabled={retryingId !== null}
                        onClick={async () => {
                          setRetryingId(r.id);
                          try {
                            const result = await retryPepHubWelcome({ data: { subscriberId: r.id } });
                            if (result.outcome === "triggered") toast.success("PepHub Automation triggered");
                            else toast.error(result.reason ?? result.outcome);
                            await load();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Retry failed");
                          } finally {
                            setRetryingId(null);
                          }
                        }}
                      >
                        <RotateCcw size={14} className="mr-2" />
                        {retryingId === r.id ? "Retrying…" : "Retry"}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-4">{r.titanelite_welcome_status}</td>
                  <td className="py-2 pr-4">
                    {r.titanelite_welcome_triggered_at
                      ? new Date(r.titanelite_welcome_triggered_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-[11px]">
                    {r.titanelite_welcome_event_name ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{r.titanelite_welcome_attempts}</td>
                  <td className="py-2 pr-4 max-w-[220px] truncate text-xs text-blood">
                    {r.titanelite_welcome_error ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {r.titanelite_welcome_status === "failed" ? (
                      <button
                        type="button"
                        className="btn-primary whitespace-nowrap"
                        disabled={retryingId !== null}
                        onClick={async () => {
                          setRetryingId(r.id);
                          try {
                            const result = await retryTitanWelcome({ data: { subscriberId: r.id } });
                            if (result.outcome === "triggered")
                              toast.success("Titan Elite Automation triggered");
                            else toast.error(("reason" in result && result.reason) || result.outcome);
                            await load();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Retry failed");
                          } finally {
                            setRetryingId(null);
                          }
                        }}
                      >
                        <RotateCcw size={14} className="mr-2" />
                        {retryingId === r.id ? "Retrying…" : "Retry"}
                      </button>
                    ) : "—"}
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
