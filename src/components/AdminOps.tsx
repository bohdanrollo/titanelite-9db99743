import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, Trash2, UserPlus } from "lucide-react";
import {
  getStripeMetrics, listMembers, getTraffic, getSiteSettings, saveSiteSettings, listTeam, grantAdminByEmail, revokeAdmin,
  getIntegrationStatus, listActivity,
  type StripeMetrics, type MemberRow, type TrafficReport, type SiteSettings,
} from "@/lib/admin-ops.functions";
import { tierLabel, tierMonthlyPrice } from "@/lib/admin-overview";

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setErr(null);
    fn().then((d) => live && setData(d)).catch((e) => live && setErr(e instanceof Error ? e.message : "Failed to load"));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { data, err, reload: () => setN((x) => x + 1) };
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div><h2 className="text-4xl lg:text-5xl font-semibold tracking-tight">{title}</h2>{sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}</div>
      {action}
    </div>
  );
}
export function Panel({ title, sub, children, className = "" }: { title?: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      {title && <h3 className="text-base font-medium">{title}</h3>}
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}
function Stat({ v, l, s }: { v: React.ReactNode; l: string; s?: string }) {
  return <div><div className="font-mono text-3xl lg:text-4xl tracking-tight">{v}</div><div className="mt-2 text-sm">{l}</div>{s && <div className="text-xs text-muted-foreground">{s}</div>}</div>;
}
function Loading({ err }: { err?: string | null }) {
  return err ? <p className="text-sm text-destructive">{err}</p> : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading…</div>;
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}
function Status({ s }: { s: string }) {
  const tone = /paid|active|approved|live|connected/i.test(s) ? "bg-[var(--admin-ok)]" : /past|ending|pending|test/i.test(s) ? "bg-[var(--admin-warn)]" : /suspend|cancel|fail|unpaid|not set|incomplete/i.test(s) ? "bg-destructive" : "bg-muted-foreground";
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs"><span className={`h-1.5 w-1.5 rounded-full ${tone}`} />{s}</span>;
}
function Bars({ values, labels, format = String }: { values: number[]; labels: [string, string]; format?: (n: number) => string }) {
  const max = Math.max(1, ...values);
  return (
    <>
      <div className="mt-6 h-40 flex items-end gap-[3px] border-b border-border">
        {values.map((v, i) => <div key={i} title={format(v)} className="flex-1 rounded-t-sm bg-[var(--admin-accent)]" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0 }} />)}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{labels[0]}</span><span>{labels[1]}</span></div>
    </>
  );
}
function Table({ head, rows, empty = "Nothing here yet." }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border">{head.map((h) => <th key={h} className="px-5 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-normal">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={head.length} className="px-5 py-6 text-muted-foreground">{empty}</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">{r.map((c, j) => <td key={j} className="px-5 py-3.5 align-middle">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Members ---------------- */

type MemberFilter = "all" | "paying" | "billing" | "nobilling" | "staff";
export function MembersPanel({ onManageAccess }: { onManageAccess: () => void }) {
  const fn = useServerFn(listMembers);
  const { data, err } = useLoad(() => fn());
  const [q, setQ] = useState("");
  const [f, setF] = useState<MemberFilter>("all");
  const rows = useMemo(() => (data ?? []).filter((m) => !q || `${m.name ?? ""} ${m.email ?? ""} ${m.phone ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const counts = data ? {
    paying: data.filter((m) => m.billing === "paying").length,
    billing: data.filter((m) => m.billing === "account").length,
    nobilling: data.filter((m) => m.billing === "none").length,
  } : null;
  const groups: Record<MemberFilter, MemberRow[]> = {
    all: rows, paying: rows.filter((m) => m.billing === "paying"), billing: rows.filter((m) => m.billing === "account"), nobilling: rows.filter((m) => m.billing === "none"), staff: rows.filter((m) => m.staff.length),
  };
  return (
    <div>
      <PageHead title="Members" sub={data ? `${data.length} accounts, most recently active first.` : undefined}
        action={<button onClick={onManageAccess} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm"><UserPlus size={15} /> Grant or change access</button>} />
      {!data ? <Loading err={err} /> : (
        <>
          <label className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3">
            <Search size={16} className="text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone" className="flex-1 bg-transparent outline-none text-sm" />
          </label>
          <div className="mt-4 mb-6 flex flex-wrap gap-2">
            {([["all", "All"], ["paying", "Paying"], ["billing", "Billing account"], ["nobilling", "No billing account"], ["staff", "Staff"]] as const).map(([k, l]) => (
              <Pill key={k} active={f === k} onClick={() => setF(k)}>{l} <span className="ml-1 font-mono text-xs opacity-60">{groups[k].length}</span></Pill>
            ))}
          </div>
          <Table head={["Member", "Plan", "Billing", "Joined", "Last active"]} rows={groups[f].slice(0, 500).map((m) => [
            <div key="m"><div className="flex items-center gap-2">{m.name || "—"}{m.staff.map((s) => <span key={s} className="rounded-full border border-border px-2 text-[11px] text-muted-foreground">{s}</span>)}</div><div className="text-xs text-muted-foreground">{m.email}</div></div>,
            m.tier ? tierLabel[m.tier] : <span className="text-muted-foreground">No plan</span>,
            <Status key="s" s={m.billing === "paying" ? "Paying" : m.billing === "account" ? "Billing account" : "No billing account"} />,
            <span key="j" className="text-muted-foreground">{date(m.created)}</span>,
            <span key="l" className="text-muted-foreground">{ago(m.lastActive)}</span>,
          ])} />
        </>
      )}
    </div>
  );
}

/* ---------------- Plans (Stripe) ---------------- */

export function useStripeMetrics() {
  const fn = useServerFn(getStripeMetrics);
  return useLoad(() => fn());
}

export function PlansPanel() {
  const { data, err, reload } = useStripeMetrics();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  if (!data) return <><PageHead title="Plans" /><Loading err={err} /></>;
  if ("error" in data) return <><PageHead title="Plans" /><p className="text-sm text-destructive">Couldn't reach Stripe: {data.error}</p></>;
  const subs = data.subscribers.filter((s) => (status === "all" || s.status === status) && (!q || `${s.name ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const byPlan = new Map<string, { n: number; mrr: number }>();
  for (const s of data.subscribers) if (["active", "trialing", "past_due", "ending"].includes(s.status)) {
    const k = s.plan ?? "Other"; const v = byPlan.get(k) ?? { n: 0, mrr: 0 }; v.n++; v.mrr += s.monthly; byPlan.set(k, v);
  }
  return (
    <div>
      <PageHead title="Plans" sub={`Live numbers from Stripe${data.environment === "sandbox" ? " (test mode)" : ""}. Prices are managed in Stripe.`}
        action={<button onClick={reload} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><RefreshCw size={14} /> Refresh</button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <Stat v={data.activeSubscriptions} l="Active subscriptions" />
        <Stat v={money(data.mrr)} l="Monthly recurring revenue" s="after discounts" />
        <Stat v={money(data.collected30)} l="Collected" s="last 30 days, minus refunds" />
        <Stat v={`${data.new30} / ${data.canceled30}`} l="New / canceled" s="last 30 days" />
        <Stat v={data.failed30} l="Failed payments" s="last 30 days" />
        <Stat v={money(data.refunded30)} l="Refunded" s="last 30 days" />
      </div>
      <div className="mt-8 grid lg:grid-cols-2 gap-4">
        <Panel title="Plans" sub="Current price and paying members per plan">
          <div className="mt-4 divide-y divide-border">
            {(["basic", "limited", "full", "elite"] as const).map((t) => {
              const v = [...byPlan.entries()].filter(([k]) => k.startsWith(t)).reduce((a, [, x]) => ({ n: a.n + x.n, mrr: a.mrr + x.mrr }), { n: 0, mrr: 0 });
              return (
                <div key={t} className="py-3 flex justify-between text-sm">
                  <span>{tierLabel[t]} <span className="text-muted-foreground">· {t === "basic" ? "Free for new members" : `${money(tierMonthlyPrice(t))}/mo`}</span></span>
                  <span>{v.n} <span className="font-mono text-muted-foreground">· {money(Math.round(v.mrr * 100) / 100)}/mo</span></span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Money collected per day" sub="Last 30 days">
          <Bars values={data.revenuePerDay.map((d) => d.amount)} labels={[data.revenuePerDay[0]?.day.slice(5) ?? "", data.revenuePerDay.at(-1)?.day.slice(5) ?? ""]} format={money} />
        </Panel>
      </div>
      <h3 className="mt-10 mb-4 text-xl font-medium">Subscribers</h3>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded-full border border-border bg-card px-4 py-1.5 text-sm outline-none" />
        {["all", "active", "trialing", "past_due", "ending", "canceled", "incomplete"].map((s) => <Pill key={s} active={status === s} onClick={() => setStatus(s)}>{s === "all" ? "All" : s.replace("_", " ")}</Pill>)}
      </div>
      <Table head={["Member", "Plan", "Status", "Per month", "Renews / ends", "Started"]} rows={subs.slice(0, 500).map((s) => [
        <div key="m"><div>{s.name || "—"}</div><div className="text-xs text-muted-foreground">{s.email}</div></div>,
        s.plan ?? "—", <Status key="s" s={s.status.replace("_", " ")} />, <span key="p" className="font-mono">{s.monthly ? money(s.monthly) : "—"}</span>,
        <span key="r" className="text-muted-foreground">{date(s.renews)}</span>, <span key="c" className="text-muted-foreground">{date(s.created)}</span>,
      ])} />
    </div>
  );
}

/* ---------------- Traffic ---------------- */

export function TrafficPanel() {
  const fn = useServerFn(getTraffic);
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const { data, err, reload } = useLoad<TrafficReport>(() => fn({ data: { days } }), [days]);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
  return (
    <div>
      <PageHead title="Traffic" sub="Who visits the public site, where they come from, and how many become members."
        action={<div className="flex gap-2 items-center">{([1, 7, 30] as const).map((d) => <Pill key={d} active={days === d} onClick={() => setDays(d)}>{d === 1 ? "Today" : `${d} days`}</Pill>)}<button onClick={reload} className="ml-2 text-muted-foreground hover:text-foreground"><RefreshCw size={14} /></button></div>} />
      {!data ? <Loading err={err} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <Stat v={data.visitors} l="Visitors" /><Stat v={data.pageViews} l="Page views" /><Stat v={data.signups} l="Signed up" />
            <Stat v={data.pricingVisitors} l="Viewed pricing" /><Stat v={data.paid} l="Paid" /><Stat v={pct(data.paid, data.visitors)} l="Visitor → paid" s="rough guide" />
          </div>
          <div className="mt-8 grid lg:grid-cols-2 gap-4">
            <Panel title="Visitors" sub={days === 1 ? "By hour, today (UTC)" : `Per day, last ${days} days`}>
              <Bars values={data.series.map((s) => s.visitors)} labels={[data.series[0]?.label ?? "", data.series.at(-1)?.label ?? ""]} />
            </Panel>
            <Panel title="From visit to paid member" sub="Each step as a share of visitors in this range">
              <div className="mt-4 space-y-4">
                {([["Visited", data.visitors], ["Viewed pricing", data.pricingVisitors], ["Signed up", data.signups], ["Paid", data.paid]] as const).map(([l, v]) => (
                  <div key={l}><div className="flex justify-between text-sm"><span>{l}</span><span className="font-mono">{v} <span className="text-muted-foreground">{pct(v, data.visitors)}</span></span></div>
                    <div className="mt-2 h-[3px] rounded bg-muted"><div className="h-full rounded bg-[var(--admin-accent)]" style={{ width: pct(Math.min(v, data.visitors), data.visitors) }} /></div></div>
                ))}
              </div>
            </Panel>
            <ListPanel title="Where they came from" rows={data.sources.map((s) => [s.name, s.visitors])} />
            <ListPanel title="Countries" rows={data.countries.map((s) => [s.name, s.visitors])} />
            <ListPanel title="Devices" rows={data.devices.map((s) => [s.name, s.visitors])} />
            <ListPanel title="Where they landed" rows={data.landing.map((s) => [s.path, s.visits])} />
          </div>
          <h3 className="mt-10 mb-4 text-xl font-medium">Pages</h3>
          <Table head={["Page", "Views", "Avg time"]} rows={data.pages.map((p) => [p.path, <span key="v" className="font-mono">{p.views}</span>, <span key="t" className="text-muted-foreground">{p.avgSeconds}s</span>])} empty="No visits recorded yet. Visits count from now on." />
        </>
      )}
    </div>
  );
}
function ListPanel({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Panel title={title}>
      <div className="mt-3 divide-y divide-border">
        {rows.length === 0 && <p className="py-3 text-sm text-muted-foreground">No data yet.</p>}
        {rows.map(([k, v]) => <div key={k} className="py-2.5 flex justify-between text-sm"><span className="truncate">{k}</span><span className="font-mono">{v}</span></div>)}
      </div>
    </Panel>
  );
}

/* ---------------- Site ---------------- */

export function SitePanel() {
  const getFn = useServerFn(getSiteSettings);
  const saveFn = useServerFn(saveSiteSettings);
  const { data, err } = useLoad(() => getFn());
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return <><PageHead title="Site" /><Loading err={err} /></>;
  const input = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground/40";
  const save = async () => {
    setBusy(true);
    try { await saveFn({ data: s }); toast.success("Saved — live on the site now."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <PageHead title="Site" sub="Announcement banner and contact details on the public site. Saves go live straight away." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Announcement banner" sub="A thin bar across the top of every public page.">
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={s.banner.enabled} onChange={(e) => setS({ ...s, banner: { ...s.banner, enabled: e.target.checked } })} /> Show the banner</label>
            <input className={input} placeholder="Banner text" value={s.banner.text} onChange={(e) => setS({ ...s, banner: { ...s.banner, text: e.target.value } })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={input} placeholder="Button label (optional)" value={s.banner.linkLabel} onChange={(e) => setS({ ...s, banner: { ...s.banner, linkLabel: e.target.value } })} />
              <input className={input} placeholder="Link, e.g. /pephub" value={s.banner.linkUrl} onChange={(e) => setS({ ...s, banner: { ...s.banner, linkUrl: e.target.value } })} />
            </div>
          </div>
        </Panel>
        <Panel title="Contact" sub="Support email shown to members.">
          <input className={`${input} mt-4`} value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} />
        </Panel>
      </div>
      <button disabled={busy} onClick={save} className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-2.5 text-sm disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Save and publish</button>
    </div>
  );
}

/* ---------------- Team & security ---------------- */

export function TeamPanel() {
  const fn = useServerFn(listTeam);
  const grantFn = useServerFn(grantAdminByEmail);
  const revokeFn = useServerFn(revokeAdmin);
  const { data, err, reload } = useLoad(() => fn());
  const [email, setEmail] = useState("");
  const run = async (p: Promise<unknown>, ok: string) => { try { await p; toast.success(ok); reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };
  return (
    <div>
      <PageHead title="Team & security" sub="Who can open this admin panel, and your coaches." />
      {!data ? <Loading err={err} /> : (
        <div className="space-y-8">
          <form onSubmit={(e) => { e.preventDefault(); if (email) run(grantFn({ data: { email } }).then(() => setEmail("")), "Admin access granted."); }} className="flex flex-wrap gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email of an existing account" className="flex-1 min-w-60 rounded-full border border-border bg-card px-5 py-2.5 text-sm outline-none" />
            <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm">Make admin</button>
          </form>
          <div>
            <h3 className="mb-3 text-lg font-medium">Admins</h3>
            <Table head={["Person", "Admin since", ""]} rows={data.admins.map((a: { userId: string; name: string | null; email: string | null; since: string }) => [
              <div key="p"><div>{a.name || "—"} {a.userId === data.me && <span className="text-xs text-muted-foreground">(you)</span>}</div><div className="text-xs text-muted-foreground">{a.email}</div></div>,
              <span key="d" className="text-muted-foreground">{date(a.since)}</span>,
              a.userId === data.me ? null : <button key="r" onClick={() => confirm(`Remove admin access for ${a.email}?`) && run(revokeFn({ data: { userId: a.userId } }), "Admin access removed.")} className="text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>,
            ])} />
          </div>
          <div>
            <h3 className="mb-3 text-lg font-medium">Coaches</h3>
            <Table head={["Coach", "Status", "Joined"]} rows={data.coaches.map((c: { name: string | null; email: string | null; status: string; since: string }) => [
              <div key="c"><div>{c.name || "—"}</div><div className="text-xs text-muted-foreground">{c.email}</div></div>, <Status key="s" s={c.status} />, <span key="d" className="text-muted-foreground">{date(c.since)}</span>,
            ])} empty="No coaches yet. Manage coaches in Coach calls." />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */

export function SettingsPanel() {
  const fn = useServerFn(getIntegrationStatus);
  const { data, err } = useLoad(() => fn());
  return (
    <div>
      <PageHead title="Settings" sub="Connected services. Keys are stored securely and never shown here." />
      {!data ? <Loading err={err} /> : <Table head={["Service", "Status"]} rows={data.map((i) => [i.name, <Status key="s" s={i.status} />])} />}
    </div>
  );
}

/* ---------------- Activity & logs ---------------- */

export function LogsPanel() {
  const fn = useServerFn(listActivity);
  const { data, err, reload } = useLoad(() => fn());
  return (
    <div>
      <PageHead title="Activity & logs" sub="Admin changes and failed emails." action={<button onClick={reload} className="text-muted-foreground hover:text-foreground"><RefreshCw size={14} /></button>} />
      {!data ? <Loading err={err} /> : (
        <div className="space-y-8">
          <Table head={["When", "Who", "What"]} rows={data.activity.map((a: { who: string; action: string; detail: string | null; at: string }) => [<span key="w" className="text-muted-foreground whitespace-nowrap">{ago(a.at)}</span>, a.who, <div key="d">{a.action}{a.detail && <div className="text-xs text-muted-foreground">{a.detail}</div>}</div>])} empty="No admin changes recorded yet." />
          <div><h3 className="mb-3 text-lg font-medium">Failed emails</h3>
            <Table head={["When", "To", "Email", "Reason"]} rows={data.emailFailures.map((e: { to: string; template: string; error: string | null; at: string }) => [<span key="w" className="text-muted-foreground whitespace-nowrap">{ago(e.at)}</span>, e.to, e.template, <span key="r" className="text-xs text-muted-foreground">{e.error ?? "—"}</span>])} empty="No failed emails." /></div>
        </div>
      )}
    </div>
  );
}

export type { StripeMetrics };
