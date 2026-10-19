import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { configuredPaymentEnvironment } from "@/lib/payment-environment";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function logActivity(admin: any, actorId: string, action: string, detail?: string) {
  const { data: p } = await admin.from("profiles").select("email").eq("id", actorId).maybeSingle();
  await admin.from("admin_activity").insert({ actor_id: actorId, actor_email: p?.email ?? null, action, detail: detail ?? null });
}

/* ---------------- Stripe ---------------- */

export type StripeSubscriber = {
  id: string; email: string | null; name: string | null; plan: string | null;
  status: string; monthly: number; renews: string | null; cancelAtPeriodEnd: boolean; created: string;
};
export type StripeMetrics = {
  environment: "sandbox" | "live";
  activeSubscriptions: number;
  mrr: number;
  collected30: number;
  refunded30: number;
  failed7: number;
  failed30: number;
  new30: number;
  canceled30: number;
  revenuePerDay: { day: string; amount: number }[];
  subscribers: StripeSubscriber[];
};

const ACTIVE = new Set(["active", "trialing", "past_due"]);

function monthlyAmount(sub: any): number {
  let total = 0;
  for (const item of sub.items?.data ?? []) {
    const p = item.price;
    if (!p?.unit_amount || !p.recurring) continue;
    const qty = item.quantity ?? 1;
    const per = p.recurring.interval === "year" ? 1 / 12 : p.recurring.interval === "week" ? 52 / 12 : p.recurring.interval === "day" ? 365 / 12 : 1;
    total += (p.unit_amount / 100) * qty * per / (p.recurring.interval_count || 1);
  }
  // Apply a percentage or fixed coupon if one is attached.
  const coupons = [sub.discount?.coupon, ...(sub.discounts ?? []).map((d: any) => (typeof d === "object" ? d?.coupon ?? d?.source?.coupon : null))].filter(Boolean);
  for (const c of coupons) {
    if (c.percent_off) total *= 1 - c.percent_off / 100;
    else if (c.amount_off) total = Math.max(0, total - c.amount_off / 100);
  }
  return Math.round(total * 100) / 100;
}

export const getStripeMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StripeMetrics | { error: string }> => {
    await requireAdmin(context);
    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      // Read-only reporting: always prefer real (live) Stripe data when it is connected.
      const env: "sandbox" | "live" = process.env.STRIPE_LIVE_API_KEY ? "live" : configuredPaymentEnvironment();
      const stripe = createStripeClient(env);
      const now = Math.floor(Date.now() / 1000);
      const since30 = now - 30 * 86400;
      const since7 = now - 7 * 86400;

      const subscribers: StripeSubscriber[] = [];
      let mrr = 0, active = 0, new30 = 0, canceled30 = 0;
      for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer", "data.discounts"] }) as any) {
        if (subscribers.length >= 2000) break;
        const cust = typeof sub.customer === "object" ? sub.customer : null;
        const isActive = ACTIVE.has(sub.status);
        const monthly = isActive ? monthlyAmount(sub) : 0;
        if (isActive) { active++; mrr += monthly; }
        if (sub.created >= since30) new30++;
        if (sub.canceled_at && sub.canceled_at >= since30) canceled30++;
        const item = sub.items?.data?.[0];
        const periodEnd = item?.current_period_end ?? sub.current_period_end;
        subscribers.push({
          id: sub.id,
          email: cust?.email ?? null,
          name: cust?.name ?? null,
          plan: item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? item?.price?.nickname ?? null,
          status: sub.cancel_at_period_end && isActive ? "ending" : sub.status,
          monthly,
          renews: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          created: new Date(sub.created * 1000).toISOString(),
        });
      }

      const days = new Map<string, number>();
      for (let i = 29; i >= 0; i--) days.set(new Date((now - i * 86400) * 1000).toISOString().slice(0, 10), 0);
      let collected30 = 0, refunded30 = 0, failed7 = 0, failed30 = 0;
      for await (const ch of stripe.charges.list({ created: { gte: since30 }, limit: 100 }) as any) {
        if (ch.status === "failed") { failed30++; if (ch.created >= since7) failed7++; continue; }
        if (ch.status !== "succeeded" || !ch.paid) continue;
        const amt = (ch.amount - (ch.amount_refunded ?? 0)) / 100;
        collected30 += amt;
        refunded30 += (ch.amount_refunded ?? 0) / 100;
        const k = new Date(ch.created * 1000).toISOString().slice(0, 10);
        if (days.has(k)) days.set(k, (days.get(k) ?? 0) + amt);
      }

      return {
        environment: env,
        activeSubscriptions: active,
        mrr: Math.round(mrr * 100) / 100,
        collected30: Math.round(collected30 * 100) / 100,
        refunded30: Math.round(refunded30 * 100) / 100,
        failed7, failed30, new30, canceled30,
        revenuePerDay: [...days.entries()].map(([day, amount]) => ({ day, amount: Math.round(amount * 100) / 100 })),
        subscribers: subscribers.sort((a, b) => b.created.localeCompare(a.created)),
      };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });

/* ---------------- Members ---------------- */

export type MemberRow = {
  id: string; name: string | null; email: string | null; phone: string | null; created: string; lastActive: string;
  tier: "basic" | "limited" | "full" | "elite" | null; paid: boolean; staff: string[];
  /** "paying" = active subscription, "account" = Stripe billing account but not paying, "none" = no billing account. */
  billing: "paying" | "account" | "none";
};

/** Email-keyed billing facts from Stripe: has a customer record, and has an active subscription. */
async function readStripeBilling(): Promise<Map<string, { account: boolean; active: boolean }>> {
  const { createStripeClient } = await import("@/lib/stripe.server");
  const env: "sandbox" | "live" = process.env.STRIPE_LIVE_API_KEY ? "live" : configuredPaymentEnvironment();
  const stripe = createStripeClient(env);
  const map = new Map<string, { account: boolean; active: boolean }>();
  const touch = (email: string) => {
    const k = email.trim().toLowerCase();
    const v = map.get(k) ?? { account: false, active: false };
    map.set(k, v);
    return v;
  };
  let seen = 0;
  for await (const cust of stripe.customers.list({ limit: 100 }) as any) {
    if (seen++ >= 2000) break;
    if (cust.email) touch(cust.email).account = true;
  }
  seen = 0;
  for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] }) as any) {
    if (seen++ >= 2000) break;
    const email = typeof sub.customer === "object" ? sub.customer?.email : null;
    if (email) touch(email).active = ACTIVE.has(sub.status);
  }
  return map;
}

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberRow[]> => {
    const admin = await requireAdmin(context);
    const [profiles, access, roles, coaches] = await Promise.all([
      admin.from("profiles").select("id, full_name, email, phone, created_at, updated_at").order("updated_at", { ascending: false }).limit(5000),
      admin.from("user_access").select("user_id, tier, stripe_price_id, stripe_customer_id"),
      admin.from("user_roles").select("user_id, role").neq("role", "client"),
      admin.from("coaches").select("user_id, status"),
    ]);
    const rank = { basic: 0, limited: 1, full: 2, elite: 3 } as const;
    const acc = new Map<string, { tier: keyof typeof rank; paid: boolean; customer: boolean }>();
    for (const r of access.data ?? []) {
      const cur = acc.get(r.user_id);
      const paid = !!r.stripe_price_id && !/^(admin_|affiliate_comp|comp_)/.test(r.stripe_price_id);
      const customer = !!r.stripe_customer_id;
      if (!cur) acc.set(r.user_id, { tier: r.tier, paid, customer });
      else {
        if (rank[r.tier as keyof typeof rank] > rank[cur.tier]) cur.tier = r.tier;
        cur.paid = cur.paid || paid;
        cur.customer = cur.customer || customer;
      }
    }
    // Live Stripe is the billing truth; fall back to stored billing records if Stripe isn't connected.
    let stripeBilling: Map<string, { account: boolean; active: boolean }> | null = null;
    try { stripeBilling = await readStripeBilling(); } catch { /* fall back below */ }
    const billingFor = (email: string | null, fallback: { paid: boolean; customer: boolean }): "paying" | "account" | "none" => {
      if (stripeBilling) {
        const hit = email ? stripeBilling.get(email.trim().toLowerCase()) : undefined;
        if (hit) return hit.active ? "paying" : "account";
        return "none";
      }
      return fallback.paid ? "paying" : fallback.customer ? "account" : "none";
    };
    const staff = new Map<string, string[]>();
    for (const r of roles.data ?? []) staff.set(r.user_id, [...(staff.get(r.user_id) ?? []), r.role]);
    for (const c of coaches.data ?? []) if (c.user_id && c.status === "approved") staff.set(c.user_id, [...(staff.get(c.user_id) ?? []), "coach"]);
    return (profiles.data ?? []).map((p: any) => {
      const a = acc.get(p.id);
      return {
        id: p.id, name: p.full_name, email: p.email, phone: p.phone, created: p.created_at, lastActive: p.updated_at,
        tier: a?.tier ?? null, paid: a?.paid ?? false, staff: staff.get(p.id) ?? [],
        billing: billingFor(p.email, { paid: a?.paid ?? false, customer: a?.customer ?? false }),
      };
    });
  });

/* ---------------- Traffic ---------------- */

export const trackPageView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    visitorId: z.string().regex(/^[a-z0-9-]{8,64}$/i),
    sessionId: z.string().regex(/^[a-z0-9-]{8,64}$/i),
    path: z.string().max(300).regex(/^\//),
    referrer: z.string().max(500).optional(),
    device: z.enum(["mobile", "tablet", "desktop"]),
    durationMs: z.number().int().min(0).max(3_600_000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    // Don't record admin screens or private paths.
    if (/^\/(admin|coach|api|lovable)/.test(data.path)) return { ok: true };
    let referrerHost: string | null = null;
    try { if (data.referrer) referrerHost = new URL(data.referrer).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    const ownHost = (getRequestHeader("host") ?? "").replace(/^www\./, "");
    if (referrerHost && ownHost && referrerHost === ownHost) referrerHost = null;
    const country = getRequestHeader("cf-ipcountry") ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("page_views").insert({
      visitor_id: data.visitorId, session_id: data.sessionId, path: data.path.split("?")[0],
      referrer_host: referrerHost, device: data.device, country: country && country !== "XX" ? country : null,
      duration_ms: data.durationMs ?? null,
    });
    return { ok: true };
  });

export type TrafficReport = {
  visitors: number; pageViews: number; signups: number; paid: number;
  series: { label: string; visitors: number; views: number }[];
  sources: { name: string; visitors: number }[];
  countries: { name: string; visitors: number }[];
  devices: { name: string; visitors: number }[];
  landing: { path: string; visits: number }[];
  pages: { path: string; views: number; avgSeconds: number }[];
  pricingVisitors: number;
};

export const getTraffic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(30)]) }).parse(d))
  .handler(async ({ data, context }): Promise<TrafficReport> => {
    const admin = await requireAdmin(context);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const rows: any[] = [];
    for (let from = 0; from < 50000; from += 1000) {
      const { data: page } = await admin.from("page_views").select("visitor_id, session_id, path, referrer_host, device, country, duration_ms, created_at")
        .gte("created_at", since).order("created_at", { ascending: true }).range(from, from + 999);
      rows.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const [{ count: signups }, { count: paid }] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
      admin.from("user_access").select("id", { count: "exact", head: true }).gte("created_at", since).not("stripe_price_id", "is", null).not("stripe_price_id", "like", "admin_%"),
    ]);

    const hourly = data.days === 1;
    const buckets = new Map<string, { v: Set<string>; views: number }>();
    if (hourly) for (let h = 0; h < 24; h++) buckets.set(String(h), { v: new Set(), views: 0 });
    else for (let i = data.days - 1; i >= 0; i--) buckets.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), { v: new Set(), views: 0 });

    const count = (m: Map<string, Set<string>>, k: string, v: string) => { if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(v); };
    const src = new Map<string, Set<string>>(), ctry = new Map<string, Set<string>>(), dev = new Map<string, Set<string>>();
    const firstBySession = new Map<string, string>();
    const pages = new Map<string, { views: number; ms: number; n: number }>();
    const visitors = new Set<string>(); const pricing = new Set<string>();
    for (const r of rows) {
      visitors.add(r.visitor_id);
      const key = hourly ? String(new Date(r.created_at).getUTCHours()) : r.created_at.slice(0, 10);
      const b = buckets.get(key); if (b) { b.v.add(r.visitor_id); b.views++; }
      if (!firstBySession.has(r.session_id)) {
        firstBySession.set(r.session_id, r.path);
        count(src, r.referrer_host ?? "Direct", r.visitor_id);
      }
      count(ctry, r.country ?? "Unknown", r.visitor_id);
      count(dev, r.device ?? "Unknown", r.visitor_id);
      if (/pric|checkout/.test(r.path)) pricing.add(r.visitor_id);
      const p = pages.get(r.path) ?? { views: 0, ms: 0, n: 0 };
      p.views++; if (r.duration_ms) { p.ms += r.duration_ms; p.n++; }
      pages.set(r.path, p);
    }
    const top = (m: Map<string, Set<string>>) => [...m.entries()].map(([name, s]) => ({ name, visitors: s.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 10);
    const landing = new Map<string, number>();
    for (const p of firstBySession.values()) landing.set(p, (landing.get(p) ?? 0) + 1);

    return {
      visitors: visitors.size, pageViews: rows.length, signups: signups ?? 0, paid: paid ?? 0,
      series: [...buckets.entries()].map(([k, b]) => ({ label: hourly ? `${k}:00` : k.slice(5), visitors: b.v.size, views: b.views })),
      sources: top(src), countries: top(ctry), devices: top(dev),
      landing: [...landing.entries()].map(([path, visits]) => ({ path, visits })).sort((a, b) => b.visits - a.visits).slice(0, 10),
      pages: [...pages.entries()].map(([path, p]) => ({ path, views: p.views, avgSeconds: p.n ? Math.round(p.ms / p.n / 1000) : 0 })).sort((a, b) => b.views - a.views).slice(0, 15),
      pricingVisitors: pricing.size,
    };
  });

/* ---------------- Site settings ---------------- */

export const siteSettingsSchema = z.object({
  banner: z.object({ enabled: z.boolean(), text: z.string().max(200), linkLabel: z.string().max(40), linkUrl: z.string().max(300) }),
  supportEmail: z.string().max(200),
  maintenance: z.object({ enabled: z.boolean(), message: z.string().max(300) }),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
const DEFAULT_SETTINGS: SiteSettings = {
  banner: { enabled: false, text: "", linkLabel: "", linkUrl: "" },
  supportEmail: "support@peplog.com",
  maintenance: { enabled: false, message: "We'll be right back." },
};

async function readSettings(admin: any): Promise<SiteSettings> {
  const { data } = await admin.from("site_settings").select("key, value").in("key", ["banner", "supportEmail", "maintenance"]);
  const out: any = structuredClone(DEFAULT_SETTINGS);
  for (const r of data ?? []) out[r.key] = r.key === "supportEmail" ? r.value?.value ?? out.supportEmail : { ...out[r.key], ...r.value };
  return siteSettingsSchema.parse(out);
}

/** Public: only the banner and support email are exposed. */
export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const s = await readSettings(supabaseAdmin);
  return { banner: s.banner.enabled ? s.banner : null, supportEmail: s.supportEmail };
});

export const getSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readSettings(await requireAdmin(context)));

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => siteSettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    if (data.banner.linkUrl && !/^(https:\/\/|\/)/.test(data.banner.linkUrl)) throw new Error("Banner link must start with https:// or /");
    const now = new Date().toISOString();
    await admin.from("site_settings").upsert([
      { key: "banner", value: data.banner, updated_by: context.userId, updated_at: now },
      { key: "supportEmail", value: { value: data.supportEmail }, updated_by: context.userId, updated_at: now },
      { key: "maintenance", value: data.maintenance, updated_by: context.userId, updated_at: now },
    ]);
    await logActivity(admin, context.userId, "Site settings updated", data.banner.enabled ? `Banner on: ${data.banner.text}` : "Banner off");
    return { ok: true };
  });

/* ---------------- Team ---------------- */

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    const [{ data: roles }, { data: coaches }] = await Promise.all([
      admin.from("user_roles").select("user_id, role, created_at").eq("role", "admin"),
      admin.from("coaches").select("user_id, first_name, last_name, email, status, created_at"),
    ]);
    const ids = (roles ?? []).map((r: any) => r.user_id);
    const { data: profs } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      me: context.userId,
      admins: (roles ?? []).map((r: any) => ({ userId: r.user_id, name: (pm.get(r.user_id) as any)?.full_name ?? null, email: (pm.get(r.user_id) as any)?.email ?? null, since: r.created_at })),
      coaches: (coaches ?? []).map((c: any) => ({ userId: c.user_id, name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null, email: c.email, status: c.status, since: c.created_at })),
    };
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const { data: p } = await admin.from("profiles").select("id, email").ilike("email", data.email.trim()).maybeSingle();
    if (!p) throw new Error("No account with that email. They need to sign up first.");
    const { error } = await admin.from("user_roles").upsert({ user_id: p.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await logActivity(admin, context.userId, "Admin access granted", p.email);
    return { ok: true };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("You can't remove your own admin access.");
    const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("At least one admin is required.");
    const { data: p } = await admin.from("profiles").select("email").eq("id", data.userId).maybeSingle();
    await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    await logActivity(admin, context.userId, "Admin access removed", p?.email ?? data.userId);
    return { ok: true };
  });

/* ---------------- Settings & logs ---------------- */

export const getIntegrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const has = (k: string) => !!process.env[k];
    let payments: string = "Not configured";
    try { payments = configuredPaymentEnvironment() === "live" ? "Live" : "Test mode"; } catch { /* keep */ }
    return [
      { name: "Payments (Stripe)", status: payments, ok: payments === "Live" },
      { name: "Live payment updates", status: has("PAYMENTS_LIVE_WEBHOOK_SECRET") ? "Connected" : "Not set", ok: has("PAYMENTS_LIVE_WEBHOOK_SECRET") },
      { name: "Email (Resend)", status: has("RESEND_API_KEY") ? "Connected" : "Not set", ok: has("RESEND_API_KEY") },
      { name: "AI features", status: has("LOVABLE_API_KEY") ? "Connected" : "Not set", ok: has("LOVABLE_API_KEY") },
      { name: "Discord alerts", status: has("DISCORD_WEBHOOK_URL") ? "Connected" : "Not set", ok: has("DISCORD_WEBHOOK_URL") },
      { name: "Vendor inbox (Gmail)", status: has("GOOGLE_MAIL_API_KEY") ? "Connected" : "Not set", ok: has("GOOGLE_MAIL_API_KEY") },
      { name: "Nutrition database", status: has("USDA_FDC_API_KEY") || has("FDC_API_KEY") ? "Connected" : "Not set", ok: has("USDA_FDC_API_KEY") || has("FDC_API_KEY") },
    ];
  });

export const listActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    const [{ data: acts }, { data: emails }] = await Promise.all([
      admin.from("admin_activity").select("actor_email, action, detail, created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("email_send_log").select("recipient_email, template_name, status, error_message, created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(30),
    ]);
    return {
      activity: (acts ?? []).map((a: any) => ({ who: a.actor_email ?? "Admin", action: a.action, detail: a.detail, at: a.created_at })),
      emailFailures: (emails ?? []).map((e: any) => ({ to: e.recipient_email, template: e.template_name, error: e.error_message, at: e.created_at })),
    };
  });
