import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tierMonthlyPrice, type OverviewTier } from "@/lib/admin-overview";

export type AdminOverview = {
  members: number;
  activeThisWeek: number;
  paidMembers: number;
  mrr: number;
  signupsToday: number;
  signupsPerDay: { day: string; count: number }[];
  planMix: { tier: OverviewTier; members: number; monthly: number }[];
  attention: { key: string; title: string; detail: string; tone: "warn" | "info" }[];
  affiliates: { active: number; pending: number; owedCents: number };
  recent: { who: string; what: string; at: string }[];
};

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const since30 = new Date(Date.now() - 29 * 86400000);
    since30.setUTCHours(0, 0, 0, 0);

    const [profiles, access, affiliates, contact, calls, peptides, intakes] = await Promise.all([
      admin.from("profiles").select("id, full_name, email, created_at, updated_at"),
      admin.from("user_access").select("user_id, tier, stripe_price_id"),
      admin.from("affiliates").select("status, earnings_cents"),
      admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
      admin.from("coach_calls").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("peptide_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("intakes").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    ]);

    const profileRows = (profiles.data ?? []) as { id: string; full_name: string | null; email: string | null; created_at: string; updated_at: string }[];
    const weekAgo = Date.now() - 7 * 86400000;
    const todayKey = new Date().toISOString().slice(0, 10);

    const buckets = new Map<string, number>();
    for (let i = 0; i < 30; i++) buckets.set(new Date(since30.getTime() + i * 86400000).toISOString().slice(0, 10), 0);
    for (const p of profileRows) {
      const k = p.created_at.slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }

    // Highest tier per member; paid = has a Stripe price on any row.
    const rank: Record<OverviewTier, number> = { basic: 0, limited: 1, full: 2, elite: 3 };
    const best = new Map<string, { tier: OverviewTier; paid: boolean }>();
    for (const r of (access.data ?? []) as { user_id: string; tier: OverviewTier; stripe_price_id: string | null }[]) {
      const cur = best.get(r.user_id);
      const paid = !!r.stripe_price_id || !!cur?.paid;
      if (!cur || rank[r.tier] > rank[cur.tier]) best.set(r.user_id, { tier: r.tier, paid });
      else cur.paid = paid;
    }
    const mix = new Map<OverviewTier, { members: number; monthly: number }>();
    let paidMembers = 0, mrr = 0;
    for (const { tier, paid } of best.values()) {
      const m = mix.get(tier) ?? { members: 0, monthly: 0 };
      m.members++;
      if (paid) { paidMembers++; m.monthly += tierMonthlyPrice(tier); mrr += tierMonthlyPrice(tier); }
      mix.set(tier, m);
    }

    const affRows = (affiliates.data ?? []) as { status: string; earnings_cents: number | null }[];
    const pendingAff = affRows.filter((a) => a.status === "pending").length;

    const attention: AdminOverview["attention"] = [];
    if (pendingAff) attention.push({ key: "affiliates", title: `${pendingAff} affiliate application${pendingAff > 1 ? "s" : ""} waiting`, detail: "Approve or reject in Affiliates.", tone: "warn" });
    if (calls.count) attention.push({ key: "calls", title: `${calls.count} coach call request${calls.count > 1 ? "s" : ""}`, detail: "Members are waiting for a time.", tone: "warn" });
    if (intakes.count) attention.push({ key: "intakes", title: `${intakes.count} intake${intakes.count > 1 ? "s" : ""} ready for a protocol`, detail: "Review and send protocols.", tone: "info" });
    if (peptides.count) attention.push({ key: "peptide-requests", title: `${peptides.count} peptide request${peptides.count > 1 ? "s" : ""}`, detail: "Members asked for new peptides.", tone: "info" });
    if (contact.count) attention.push({ key: "contact", title: `${contact.count} unread contact message${contact.count > 1 ? "s" : ""}`, detail: "From the public contact form.", tone: "info" });

    const recent = [...profileRows]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
      .map((p) => ({ who: p.full_name || p.email || "New member", what: "Created an account", at: p.created_at }));

    return {
      members: profileRows.length,
      activeThisWeek: profileRows.filter((p) => new Date(p.updated_at).getTime() >= weekAgo).length,
      paidMembers,
      mrr: Math.round(mrr * 100) / 100,
      signupsToday: buckets.get(todayKey) ?? 0,
      signupsPerDay: [...buckets.entries()].map(([day, count]) => ({ day, count })),
      planMix: (["basic", "limited", "full", "elite"] as const).filter((t) => mix.has(t)).map((t) => ({ tier: t, ...mix.get(t)! })),
      attention,
      affiliates: {
        active: affRows.filter((a) => a.status === "approved").length,
        pending: pendingAff,
        owedCents: affRows.reduce((s, a) => s + (a.earnings_cents ?? 0), 0),
      },
      recent,
    };
  });
