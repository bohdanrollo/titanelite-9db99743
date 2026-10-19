import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { getAdminOverview, type AdminOverview as Data } from "@/lib/admin-overview.functions";
import { tierLabel } from "@/lib/admin-overview";
import { useStripeMetrics } from "@/components/AdminOps";

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
const ago = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  return h < 1 ? "just now" : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

export default function AdminOverview({ onOpen }: { onOpen: (tab: string) => void }) {
  const fn = useServerFn(getAdminOverview);
  const [d, setD] = useState<Data | null>(null);
  const { data: sm } = useStripeMetrics();
  const stripe = sm && !("error" in sm) ? sm : null;
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fn().then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Failed to load")); }, [fn]);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!d) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading overview…</div>;

  const max = Math.max(1, ...d.signupsPerDay.map((s) => s.count));
  const maxMix = Math.max(1, ...d.planMix.map((p) => p.members));
  const stats = [
    { v: d.members, l: "Members", s: `${d.activeThisWeek} active this week` },
    { v: stripe ? stripe.activeSubscriptions : d.paidMembers, l: "Paid subscriptions", s: stripe ? "from Stripe" : "loading Stripe…" },
    { v: `$${Math.round(stripe ? stripe.mrr : d.mrr).toLocaleString()}`, l: "MRR", s: stripe ? "Stripe, after discounts" : "list prices, estimate" },
    { v: stripe ? `$${Math.round(stripe.collected30).toLocaleString()}` : "…", l: "Collected", s: "last 30 days" },
    { v: d.signupsToday, l: "New signups today" },
    { v: stripe ? stripe.failed7 : "…", l: "Failed payments", s: "last 7 days" },
  ];

  return (
    <div>
      <p className="text-sm text-muted-foreground">Today is {today}</p>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="font-mono text-4xl lg:text-5xl tracking-tight">{s.v}</div>
            <div className="mt-2 text-sm">{s.l}</div>
            {s.s && <div className="text-xs text-muted-foreground">{s.s}</div>}
          </div>
        ))}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-4">
        <Card title="Signups per day" sub="Last 30 days">
          <div className="mt-6 h-44 flex items-end gap-[3px] border-b border-border">
            {d.signupsPerDay.map((s) => (
              <div key={s.day} title={`${s.day}: ${s.count}`} className="flex-1 rounded-t-sm bg-[var(--admin-accent)]"
                style={{ height: `${(s.count / max) * 100}%`, minHeight: s.count ? 3 : 0 }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{d.signupsPerDay[0]?.day.slice(5)}</span><span>{d.signupsPerDay.at(-1)?.day.slice(5)}</span>
          </div>
        </Card>

        <Card title="Plan mix" sub="Members with access right now, and what paid members bring in per month">
          <div className="mt-4 divide-y divide-border">
            {d.planMix.length === 0 && <p className="py-3 text-sm text-muted-foreground">No members with access yet.</p>}
            {d.planMix.map((p) => (
              <div key={p.tier} className="py-3">
                <div className="flex justify-between text-sm">
                  <span>{tierLabel[p.tier]}</span>
                  <span>{p.members} <span className="text-muted-foreground font-mono">· {money(p.monthly)}/mo</span></span>
                </div>
                <div className="mt-2 h-[3px] rounded bg-muted">
                  <div className="h-full rounded bg-[var(--admin-accent)]" style={{ width: `${(p.members / maxMix) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Needs attention">
          <ul className="mt-4 divide-y divide-border">
            {stripe && stripe.failed7 > 0 && (
              <li><button onClick={() => onOpen("plans")} className="w-full py-3 flex items-start gap-3 text-left group"><span className="mt-1.5 h-2 w-2 rounded-full bg-destructive" /><span className="flex-1"><span className="block text-sm">{stripe.failed7} failed payment{stripe.failed7 > 1 ? "s" : ""} this week</span><span className="block text-xs text-muted-foreground">Check subscribers in Plans.</span></span><ArrowUpRight size={14} className="text-muted-foreground" /></button></li>
            )}
            {sm && "error" in sm && <li className="py-3 text-xs text-muted-foreground">Stripe unavailable: {sm.error}</li>}
            {d.attention.length === 0 && <li className="py-3 text-sm text-muted-foreground">All clear.</li>}
            {d.attention.map((a) => (
              <li key={a.key}>
                <button onClick={() => onOpen(a.key)} className="w-full py-3 flex items-start gap-3 text-left group">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${a.tone === "warn" ? "bg-[var(--admin-warn)]" : "bg-[var(--admin-info)]"}`} />
                  <span className="flex-1"><span className="block text-sm">{a.title}</span><span className="block text-xs text-muted-foreground">{a.detail}</span></span>
                  <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-4 content-start">
          <Card title="Affiliate commissions" action={{ l: "Affiliates", k: "affiliates" }} onOpen={onOpen}>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div><div className="font-mono text-3xl">{money(d.affiliates.owedCents / 100)}</div><div className="text-xs text-muted-foreground">Owed, not paid yet</div></div>
              <div><div className="font-mono text-3xl">{d.affiliates.pending}</div><div className="text-xs text-muted-foreground">Applications waiting</div></div>
            </div>
          </Card>
          <Card title="Recent activity" action={{ l: "Members", k: "clients" }} onOpen={onOpen}>
            <ul className="mt-3 divide-y divide-border">
              {d.recent.map((r, i) => (
                <li key={i} className="py-2.5 flex justify-between gap-4 text-sm">
                  <span className="truncate"><span className="text-muted-foreground">{r.who} ·</span> {r.what}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{ago(r.at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, sub, children, action, onOpen }: { title: string; sub?: string; children: React.ReactNode; action?: { l: string; k: string }; onOpen?: (k: string) => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex justify-between items-start">
        <div><h3 className="text-base font-medium">{title}</h3>{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}</div>
        {action && <button onClick={() => onOpen?.(action.k)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">{action.l} <ArrowUpRight size={12} /></button>}
      </div>
      {children}
    </section>
  );
}
