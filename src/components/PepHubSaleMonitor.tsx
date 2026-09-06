import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Mail, RefreshCw, XCircle } from "lucide-react";
import {
  adminMonitorOverview,
  adminUpdateMonitorSettings,
  adminUpdateSourceMonitoring,
  adminRunMonitor,
  adminApprovePromotion,
  adminRejectPromotion,
  adminSendTestSaleEmail,
  adminPromotionEmailLog,
  adminScanVendorInbox,
  adminListInboxMessages,
  type InboxMessage,
  type MonitorSettings,
  type MonitorSource,
  type Promotion,
} from "@/lib/pephub-monitor.functions";

const FREQS = [
  { v: "1h", l: "Hourly" },
  { v: "6h", l: "Every 6 hours" },
  { v: "12h", l: "Every 12 hours" },
  { v: "24h", l: "Daily" },
  { v: "disabled", l: "Disabled" },
];

const STATUS_LABEL: Record<string, string> = {
  monitoring: "🟢 Monitoring",
  sale_detected: "🔥 Sale detected",
  no_sale: "⚪ No sale",
  error: "🔴 Monitoring error",
  unavailable: "🟠 Monitoring unavailable",
  disabled: "⚫ Disabled",
  active: "🟢 Active",
};

function ago(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PepHubSaleMonitor() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<MonitorSettings | null>(null);
  const [sources, setSources] = useState<MonitorSource[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [lastRun, setLastRun] = useState<{ started_at: string } | null>(null);
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [emailLog, setEmailLog] = useState<Array<{ id: string; email: string; status: string; sent_at: string | null }>>([]);
  const [testEmail, setTestEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const overview = useServerFn(adminMonitorOverview);
  const updateSettings = useServerFn(adminUpdateMonitorSettings);
  const updateSource = useServerFn(adminUpdateSourceMonitoring);
  const runMonitor = useServerFn(adminRunMonitor);
  const approve = useServerFn(adminApprovePromotion);
  const reject = useServerFn(adminRejectPromotion);
  const sendTest = useServerFn(adminSendTestSaleEmail);
  const loadLog = useServerFn(adminPromotionEmailLog);
  const scanInbox = useServerFn(adminScanVendorInbox);
  const listInbox = useServerFn(adminListInboxMessages);
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [scanning, setScanning] = useState(false);

  const loadInbox = useCallback(async () => {
    try {
      const res = await listInbox({ data: { limit: 40 } });
      setInbox(res.messages);
    } catch {
      /* inbox list is optional */
    }
  }, [listInbox]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  async function runInboxScan() {
    setScanning(true);
    try {
      const res = await scanInbox({});
      toast.success(
        res.salesFound > 0
          ? `Found ${res.salesFound} new sale email${res.salesFound === 1 ? "" : "s"}`
          : `Checked ${res.scanned} new email${res.scanned === 1 ? "" : "s"} — no new sales`,
      );
      await Promise.all([load(), loadInbox()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inbox scan failed");
    } finally {
      setScanning(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await overview({});
      setSettings(res.settings);
      setSources(res.sources);
      setPromos(res.promotions);
      setStats(res.stats as unknown as Record<string, number>);
      setLastRun(res.lastRun as { started_at: string } | null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load monitor data");
    } finally {
      setLoading(false);
    }
  }, [overview]);

  useEffect(() => { load(); }, [load]);

  async function patchSettings(patch: Partial<MonitorSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    try {
      await updateSettings({ data: patch as never });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      load();
    }
  }

  async function run(sourceId?: string) {
    setRunning(true);
    try {
      const res = await runMonitor({ data: sourceId ? { sourceId } : {} });
      toast.success(
        res.error
          ? `Check finished with an issue: ${res.error}`
          : `Checked ${res.checked} source${res.checked === 1 ? "" : "s"} — ${res.salesFound} new promotion${res.salesFound === 1 ? "" : "s"}`,
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Monitoring run failed");
    } finally {
      setRunning(false);
    }
  }

  async function openPromo(p: Promotion) {
    setSelected(p);
    setEmailLog([]);
    try {
      const res = await loadLog({ data: { id: p.id } });
      setEmailLog(res.log as never);
    } catch { /* ignore */ }
  }

  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? "Unknown";
  const visible = promos.filter(
    (p) =>
      (filterStatus === "all" || p.status === filterStatus) &&
      (filterSource === "all" || p.source_id === filterSource),
  );

  if (loading) {
    return <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={14} /> Loading monitor…</div>;
  }

  const card = "rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm";
  const input = "mt-2 w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-blood";

  return (
    <div className="mt-6 space-y-8">
      {/* Rollout banner */}
      {settings && !settings.automatic_sending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blood/30 bg-blood/5 p-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-blood">Monitor only mode</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sales are detected and saved, but no emails go out automatically. Approve each one yourself until you trust it.
            </p>
          </div>
          <button className="btn-primary" onClick={() => patchSettings({ automatic_sending: true, require_admin_approval: false })}>
            Enable automatic emailing
          </button>
        </div>
      )}

      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Monitored", `${stats["monitored"] ?? 0}/${stats["total"] ?? 0}`],
          ["Checked OK", stats["ok"] ?? 0],
          ["Errors", stats["errors"] ?? 0],
          ["Active sales", stats["activeSales"] ?? 0],
          ["Detected today", stats["detectedToday"] ?? 0],
          ["Emails today", stats["emailsToday"] ?? 0],
        ].map(([l, v]) => (
          <div key={String(l)} className={card}>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{l}</div>
            <div className="mt-1 text-2xl">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={running} onClick={() => run()}>
          {running ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Run monitoring now
        </button>
        <button className="btn-ghost" disabled={scanning} onClick={runInboxScan}>
          {scanning ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />} Check vendor inbox
        </button>
        <span className="text-sm text-muted-foreground">
          Last run: {lastRun ? ago(lastRun.started_at) : "never"}
        </span>
      </div>

      {/* Vendor newsletter inbox */}
      <div className={card}>
        <h3 className="text-xl">Vendor newsletter inbox</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Emails from vendors in the shared PepHub deals inbox. Sale emails become promotions you can
          review and send. Add a vendor's signup page and sending domains on the Sources tab.
        </p>
        {inbox.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No vendor emails read yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-foreground/10">
            {inbox.map((m) => (
              <div key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm">{m.subject || "(no subject)"}</div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {m.from_name ? `${m.from_name} · ` : ""}{m.from_email}
                  </div>
                  {m.notes && <div className="mt-1 text-xs text-muted-foreground">{m.notes}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                    {m.sale_detected ? "🔥 Sale" : m.matched ? "✅ Vendor" : "⚪ Unmatched"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{ago(m.received_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      {settings && (
        <div className={card}>
          <h3 className="text-xl">Automation settings</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.monitoring_enabled} onChange={(e) => patchSettings({ monitoring_enabled: e.target.checked })} />
              Monitoring on
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.sale_alerts_enabled} onChange={(e) => patchSettings({ sale_alerts_enabled: e.target.checked })} />
              Sale alert emails on
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.automatic_sending} onChange={(e) => patchSettings({ automatic_sending: e.target.checked })} />
              Automatic sending
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.require_admin_approval} onChange={(e) => patchSettings({ require_admin_approval: e.target.checked })} />
              Require my approval
            </label>
            <div>
              <label className="text-eyebrow">Minimum confidence</label>
              <select className={input} value={settings.minimum_confidence} onChange={(e) => patchSettings({ minimum_confidence: e.target.value })}>
                <option value="high">High only</option>
                <option value="medium">Medium and up</option>
                <option value="low">Any</option>
              </select>
            </div>
            <div>
              <label className="text-eyebrow">Default check frequency</label>
              <select className={input} value={settings.default_frequency} onChange={(e) => patchSettings({ default_frequency: e.target.value })}>
                {FREQS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-eyebrow">Notify me at (monitoring errors + test emails)</label>
              <input className={input} value={settings.admin_notify_email ?? ""} placeholder="you@example.com"
                onChange={(e) => setSettings({ ...settings, admin_notify_email: e.target.value })}
                onBlur={(e) => patchSettings({ admin_notify_email: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* Sources table */}
      <div className="overflow-x-auto rounded-2xl border border-foreground/10 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Frequency</th>
              <th className="px-5 py-3">Last checked</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-muted-foreground">No sources yet.</td></tr>}
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-foreground/5 last:border-0 align-top">
                <td className="px-5 py-3">
                  <div>{s.name}</div>
                  {s.monitoring_error && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-blood">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {s.monitoring_error}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">{STATUS_LABEL[s.monitoring_status] ?? s.monitoring_status}</td>
                <td className="px-5 py-3">
                  <select
                    className="rounded-lg border border-foreground/15 bg-background px-2 py-1 text-xs"
                    value={s.monitoring_frequency}
                    onChange={async (e) => {
                      await updateSource({ data: { id: s.id, monitoring_frequency: e.target.value as never } });
                      load();
                    }}
                  >
                    {FREQS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{ago(s.last_checked_at)}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={s.monitoring_enabled}
                        onChange={async (e) => {
                          await updateSource({ data: { id: s.id, monitoring_enabled: e.target.checked } });
                          load();
                        }}
                      />
                      Monitor
                    </label>
                    <button className="btn-ghost" disabled={running} onClick={() => run(s.id)}>Check now</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Promotions */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl">Detected sales</h3>
          <select className="rounded-lg border border-foreground/15 bg-background px-2 py-1 text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {["all", "pending_review", "detected", "approved", "email_sent", "rejected", "expired"].map((s) => (
              <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>
            ))}
          </select>
          <select className="rounded-lg border border-foreground/15 bg-background px-2 py-1 text-xs" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-foreground/10 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Sale</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Confidence</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Detected</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={7} className="px-5 py-6 text-muted-foreground">No promotions detected yet.</td></tr>}
              {visible.map((p) => (
                <tr key={p.id} className="cursor-pointer border-b border-foreground/5 last:border-0 hover:bg-foreground/5" onClick={() => openPromo(p)}>
                  <td className="px-5 py-3">{sourceName(p.source_id)}</td>
                  <td className="px-5 py-3">{p.title}</td>
                  <td className="px-5 py-3">{p.discount_value ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{p.coupon_code ?? "—"}</td>
                  <td className="px-5 py-3 capitalize">{p.confidence_level} ({p.confidence_score})</td>
                  <td className="px-5 py-3 capitalize">{p.status.replace("_", " ")}</td>
                  <td className="px-5 py-3 text-muted-foreground">{ago(p.first_detected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-eyebrow">{sourceName(selected.source_id)}</div>
                <h3 className="mt-1 text-2xl">{selected.title}</h3>
              </div>
              <button className="btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Discount", selected.discount_value ?? "—"],
                ["Coupon", selected.coupon_code ?? "—"],
                ["Start", selected.start_date ?? "—"],
                ["End", selected.end_date ?? "—"],
                ["Confidence", `${selected.confidence_level} (${selected.confidence_score})`],
                ["Status", selected.status.replace("_", " ")],
                ["Detected", new Date(selected.first_detected_at).toLocaleString()],
                ["Recipients", String(selected.recipients)],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 capitalize">{v}</dd>
                </div>
              ))}
            </dl>

            {selected.description && <p className="mt-4 text-sm text-muted-foreground">{selected.description}</p>}
            {selected.evidence && (
              <p className="mt-3 rounded-xl bg-foreground/5 p-3 text-xs text-muted-foreground">Evidence: “{selected.evidence}”</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {selected.promotion_url && (
                <a className="btn-ghost" href={selected.promotion_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> View source
                </a>
              )}
              <button
                className="btn-ghost"
                onClick={async () => {
                  const to = testEmail || settings?.admin_notify_email || "";
                  if (!to) return toast.error("Add an admin email first");
                  try {
                    await sendTest({ data: { id: selected.id, email: to } });
                    toast.success(`Test alert sent to ${to}`);
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); }
                }}
              ><Mail size={14} /> Send test email</button>
              <button
                className="btn-primary"
                disabled={selected.status === "email_sent" || selected.status === "expired"}
                onClick={async () => {
                  if (!confirm("Email every subscribed PepHub member about this sale?")) return;
                  try {
                    const res = await approve({ data: { id: selected.id } });
                    toast.success(`Emailed ${res.sent} of ${res.total} members`);
                    setSelected(null);
                    load();
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed"); }
                }}
              ><CheckCircle2 size={14} /> Approve & send</button>
              <button
                className="btn-ghost text-blood"
                onClick={async () => {
                  await reject({ data: { id: selected.id } });
                  toast.success("Promotion rejected");
                  setSelected(null);
                  load();
                }}
              ><XCircle size={14} /> Reject sale</button>
            </div>

            <div className="mt-4">
              <label className="text-eyebrow">Test email address</label>
              <input className={input} value={testEmail} placeholder={settings?.admin_notify_email ?? "admin@example.com"} onChange={(e) => setTestEmail(e.target.value)} />
            </div>

            {emailLog.length > 0 && (
              <div className="mt-5">
                <div className="text-eyebrow">Delivery log</div>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-foreground/10">
                  {emailLog.map((r) => (
                    <div key={r.id} className="flex items-center justify-between border-b border-foreground/5 px-3 py-2 text-xs last:border-0">
                      <span className="font-mono">{r.email}</span>
                      <span className="capitalize text-muted-foreground">{r.status}{r.sent_at ? ` · ${new Date(r.sent_at).toLocaleString()}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
