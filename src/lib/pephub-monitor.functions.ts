import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MonitorSource = {
  id: string;
  name: string;
  url: string;
  affiliate_url: string | null;
  monitoring_enabled: boolean;
  monitoring_frequency: string;
  monitoring_status: string;
  last_checked_at: string | null;
  last_successful_check_at: string | null;
  last_sale_detected_at: string | null;
  monitoring_error: string | null;
  failure_count: number;
};

export type Promotion = {
  id: string;
  source_id: string;
  title: string;
  description: string | null;
  discount_type: string | null;
  discount_value: string | null;
  coupon_code: string | null;
  promotion_url: string | null;
  start_date: string | null;
  end_date: string | null;
  confidence_score: number;
  confidence_level: string;
  status: string;
  evidence: string | null;
  recipients: number;
  first_detected_at: string;
  last_verified_at: string;
  email_sent_at: string | null;
};

export type MonitorSettings = {
  automatic_sending: boolean;
  require_admin_approval: boolean;
  minimum_confidence: string;
  default_frequency: string;
  monitoring_enabled: boolean;
  sale_alerts_enabled: boolean;
  admin_notify_email: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

/** Admin: monitoring overview — settings, sources, stats, promotions. */
export const adminMonitorOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [settingsRes, sourcesRes, promosRes, runsRes] = await Promise.all([
      supabaseAdmin.from("pephub_monitor_settings").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin
        .from("pephub_sources")
        .select(
          "id, name, url, affiliate_url, monitoring_enabled, monitoring_frequency, monitoring_status, last_checked_at, last_successful_check_at, last_sale_detected_at, monitoring_error, failure_count",
        )
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("pephub_promotions")
        .select("*")
        .order("first_detected_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("pephub_monitor_runs")
        .select("id, source_id, started_at, completed_at, status, sales_found, error_message")
        .order("started_at", { ascending: false })
        .limit(50),
    ]);

    const sources = (sourcesRes.data ?? []) as MonitorSource[];
    const promotions = (promosRes.data ?? []) as Promotion[];
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const { count: emailsToday } = await supabaseAdmin
      .from("pephub_sale_emails")
      .select("id", { count: "exact", head: true })
      .gte("created_at", midnight.toISOString())
      .eq("status", "sent");

    return {
      settings: (settingsRes.data ?? null) as MonitorSettings | null,
      sources,
      promotions,
      runs: runsRes.data ?? [],
      stats: {
        monitored: sources.filter((s) => s.monitoring_enabled).length,
        total: sources.length,
        ok: sources.filter((s) => s.monitoring_enabled && !s.monitoring_error).length,
        errors: sources.filter((s) => s.monitoring_error).length,
        activeSales: promotions.filter((p) =>
          ["detected", "pending_review", "approved", "email_queued", "email_sent"].includes(p.status),
        ).length,
        detectedToday: promotions.filter((p) => new Date(p.first_detected_at) >= midnight).length,
        emailsToday: emailsToday ?? 0,
      },
      lastRun: (runsRes.data ?? [])[0] ?? null,
    };
  });

/** Admin: update global monitoring/email settings. */
export const adminUpdateMonitorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        automatic_sending: z.boolean().optional(),
        require_admin_approval: z.boolean().optional(),
        minimum_confidence: z.enum(["high", "medium", "low"]).optional(),
        default_frequency: z.enum(["1h", "6h", "12h", "24h", "disabled"]).optional(),
        monitoring_enabled: z.boolean().optional(),
        sale_alerts_enabled: z.boolean().optional(),
        admin_notify_email: z.string().email().or(z.literal("")).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = { ...data } as Record<string, any>;
    if (patch["admin_notify_email"] === "") patch["admin_notify_email"] = null;
    const { error } = await supabaseAdmin.from("pephub_monitor_settings").update(patch as never).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: enable/disable monitoring or change frequency for one source. */
export const adminUpdateSourceMonitoring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        monitoring_enabled: z.boolean().optional(),
        monitoring_frequency: z.enum(["1h", "6h", "12h", "24h", "disabled"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = {};
    if (data.monitoring_enabled !== undefined) {
      patch["monitoring_enabled"] = data.monitoring_enabled;
      patch["monitoring_status"] = data.monitoring_enabled ? "monitoring" : "disabled";
      if (data.monitoring_enabled) patch["monitoring_error"] = null;
    }
    if (data.monitoring_frequency) patch["monitoring_frequency"] = data.monitoring_frequency;
    const { error } = await supabaseAdmin.from("pephub_sources").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: run monitoring now for one source or all due/enabled sources. */
export const adminRunMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sourceId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { monitorSource, runDueMonitoring } = await import("@/lib/pephub-monitor.server");
    if (data.sourceId) {
      const res = await monitorSource(data.sourceId, "admin");
      return { checked: 1, salesFound: res.salesFound, status: res.status, error: res.error ?? null };
    }
    const res = await runDueMonitoring({ force: true, triggeredBy: "admin" });
    return { ...res, status: "ok", error: null };
  });

/** Admin: approve a promotion and email opted-in PepHub members (once). */
export const adminApprovePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { sendPromotionEmails } = await import("@/lib/pephub-monitor.server");
    return await sendPromotionEmails(data.id);
  });

/** Admin: reject a detected promotion (never emailed). */
export const adminRejectPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pephub_promotions")
      .update({ status: "rejected" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: send a test alert to a single address (never to members). */
export const adminSendTestSaleEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), email: z.string().email() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { sendTestPromotionEmail } = await import("@/lib/pephub-monitor.server");
    return await sendTestPromotionEmail(data.id, data.email);
  });

/** Admin: delivery log for one promotion (emails masked). */
export const adminPromotionEmailLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pephub_sale_emails")
      .select("id, email, status, sent_at, error_message, created_at")
      .eq("promotion_id", data.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const mask = (e: string) => {
      const [user, domain] = e.split("@");
      if (!domain || !user) return "•••";
      return `${user.slice(0, 2)}•••@${domain}`;
    };
    return {
      log: (rows ?? []).map((r) => ({ ...r, email: mask(r.email) })),
    };
  });

export type InboxMessage = {
  id: string;
  source_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  snippet: string | null;
  received_at: string | null;
  matched: boolean;
  sale_detected: boolean;
  notes: string | null;
};

/** Admin: scan the shared vendor newsletter inbox for new sales/discounts. */
export const adminScanVendorInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { scanVendorInbox } = await import("@/lib/pephub-inbox.server");
    return await scanVendorInbox("admin");
  });

/** Admin: recent vendor emails seen in the shared inbox. */
export const adminListInboxMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(40) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("pephub_inbox_messages")
      .select("id, source_id, from_email, from_name, subject, snippet, received_at, matched, sale_detected, notes")
      .order("received_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { messages: (rows ?? []) as InboxMessage[] };
  });
