import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MarketingSubscriber = {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscribed: boolean;
  source: string;
  resend_contact_id: string | null;
  resend_sync_status: string;
  resend_sync_error: string | null;
  resend_last_synced_at: string | null;
  migrated_to_resend: boolean;
  created_at: string;
  welcome_email_status: string;
  welcome_email_sent_at: string | null;
  welcome_broadcast_id: string | null;
  welcome_email_error: string | null;
  pephub_welcome_status: string;
  pephub_welcome_triggered_at: string | null;
  pephub_welcome_event_name: string | null;
  pephub_welcome_error: string | null;
  pephub_welcome_attempts: number;
  pephub_welcome_last_attempt_at: string | null;
  titanelite_welcome_status: string;
  titanelite_welcome_triggered_at: string | null;
  titanelite_welcome_event_name: string | null;
  titanelite_welcome_error: string | null;
  titanelite_welcome_attempts: number;
  titanelite_welcome_last_attempt_at: string | null;
};

export type SyncReport = {
  processed: number;
  added: number;
  updated: number;
  alreadySynced: number;
  skippedOptOut: number;
  failed: number;
  errors: string[];
};

function splitName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  const space = clean.indexOf(" ");
  if (space === -1) return { first: clean || null, last: null };
  return { first: clean.slice(0, space), last: clean.slice(space + 1) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

/**
 * Public signup. Stores the subscriber locally first (so a Resend outage never
 * loses a signup), then syncs the contact to the Resend audience.
 */
export const subscribeMarketing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(200),
        source: z.string().trim().max(60).default("pephub"),
        website: z.string().max(0).optional(), // honeypot
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true };

    const email = data.email.trim().toLowerCase();
    const { first, last } = splitName(data.name);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("marketing_subscribers")
      .select("id, subscribed, resend_contact_id")
      .ilike("email", email)
      .maybeSingle();

    // Respect an existing opt-out: signing up again re-subscribes only if the
    // person is submitting the form themselves, which is an explicit consent
    // action — so we do set subscribed true here, but never elsewhere.
    let rowId = existing?.id as string | undefined;
    if (rowId) {
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          first_name: first,
          last_name: last,
          subscribed: true,
          unsubscribed_at: null,
          resend_sync_status: "pending",
        })
        .eq("id", rowId);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("marketing_subscribers")
        .insert({
          email,
          first_name: first,
          last_name: last,
          subscribed: true,
          source: data.source,
          resend_sync_status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      rowId = inserted?.id as string | undefined;
    }

    try {
      const { upsertContact } = await import("@/lib/resend.server");
      const res = await upsertContact({
        email,
        firstName: first,
        lastName: last,
        subscribed: true,
        knownContactId: existing?.resend_contact_id ?? null,
      });
      if (rowId) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({
            resend_contact_id: res.contactId,
            migrated_to_resend: true,
            resend_sync_status: "synced",
            resend_sync_error: null,
            resend_last_synced_at: new Date().toISOString(),
          })
          .eq("id", rowId);
      }
    } catch (err) {
      console.error("[marketing] resend sync failed", err);
      if (rowId) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({
            resend_sync_status: "failed",
            resend_sync_error: err instanceof Error ? err.message : String(err),
          })
          .eq("id", rowId);
      }
    }

    return { ok: true };
  });

/** Admin: subscriber list + stats. */
export const adminMarketingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("marketing_subscribers")
      .select(
        "id, user_id, email, first_name, last_name, subscribed, source, resend_contact_id, resend_sync_status, resend_sync_error, resend_last_synced_at, migrated_to_resend, created_at, welcome_email_status, welcome_email_sent_at, welcome_broadcast_id, welcome_email_error, pephub_welcome_status, pephub_welcome_triggered_at, pephub_welcome_event_name, pephub_welcome_error, pephub_welcome_attempts, pephub_welcome_last_attempt_at, titanelite_welcome_status, titanelite_welcome_triggered_at, titanelite_welcome_event_name, titanelite_welcome_error, titanelite_welcome_attempts, titanelite_welcome_last_attempt_at",
      )
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as MarketingSubscriber[];
    const now = Date.now();
    const since = (days: number) => now - days * 86_400_000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stats = {
      total: rows.length,
      subscribed: rows.filter((r) => r.subscribed).length,
      unsubscribed: rows.filter((r) => !r.subscribed).length,
      today: rows.filter((r) => new Date(r.created_at).getTime() >= startOfToday.getTime()).length,
      week: rows.filter((r) => new Date(r.created_at).getTime() >= since(7)).length,
      month: rows.filter((r) => new Date(r.created_at).getTime() >= since(30)).length,
      synced: rows.filter((r) => r.resend_sync_status === "synced").length,
      pending: rows.filter((r) => r.resend_sync_status === "pending").length,
      failed: rows.filter((r) => r.resend_sync_status === "failed").length,
      notMigrated: rows.filter((r) => !r.migrated_to_resend).length,
      lastSync: rows
        .map((r) => r.resend_last_synced_at)
        .filter(Boolean)
        .sort()
        .pop() as string | undefined,
    };

    return { subscribers: rows, stats };
  });

/**
 * Admin: sync subscribers into the Resend audience. Idempotent — existing
 * contacts are updated, never duplicated, and opt-outs are never resubscribed.
 * `mode: "pending"` only touches records that aren't synced yet.
 */
export const adminSyncResend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ mode: z.enum(["all", "pending"]).default("all") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { upsertContact } = await import("@/lib/resend.server");

    let query = supabaseAdmin
      .from("marketing_subscribers")
      .select(
        "id, email, first_name, last_name, subscribed, resend_contact_id, migrated_to_resend, resend_sync_status",
      )
      .order("created_at", { ascending: true })
      .limit(5000);
    if (data.mode === "pending") query = query.neq("resend_sync_status", "synced");

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const report: SyncReport = {
      processed: 0,
      added: 0,
      updated: 0,
      alreadySynced: 0,
      skippedOptOut: 0,
      failed: 0,
      errors: [],
    };

    for (const row of rows ?? []) {
      report.processed += 1;

      // Opted out and never pushed to Resend: leave them out entirely.
      if (!row.subscribed && !row.resend_contact_id) {
        report.skippedOptOut += 1;
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({ resend_sync_status: "skipped_opt_out" })
          .eq("id", row.id);
        continue;
      }

      try {
        const res = await upsertContact({
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          subscribed: row.subscribed,
          knownContactId: row.resend_contact_id,
        });
        if (res.action === "created") report.added += 1;
        else if (row.migrated_to_resend && row.resend_sync_status === "synced")
          report.alreadySynced += 1;
        else report.updated += 1;

        await supabaseAdmin
          .from("marketing_subscribers")
          .update({
            resend_contact_id: res.contactId,
            migrated_to_resend: true,
            resend_sync_status: "synced",
            resend_sync_error: null,
            resend_last_synced_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      } catch (err) {
        report.failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        if (report.errors.length < 5) report.errors.push(`${row.email}: ${msg}`);
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({ resend_sync_status: "failed", resend_sync_error: msg })
          .eq("id", row.id);
      }
    }

    return report;
  });

/** Admin: how many legacy subscribers still need to reach Resend. */
export const adminMigrationPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: legacy }, { count: local }, { count: ready }] = await Promise.all([
      supabaseAdmin.from("pephub_members").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("marketing_subscribers").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("marketing_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("migrated_to_resend", false),
    ]);

    return {
      legacyRecords: legacy ?? 0,
      preservedRecords: local ?? 0,
      readyToMigrate: ready ?? 0,
    };
  });

/**
 * Admin: send the configured welcome Broadcast to ONE address for testing, or
 * retry a failed welcome. Admin-only, single recipient — this can never mass
 * send, because the Broadcast send endpoint is never called.
 */
export const adminSendTestWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(200),
        force: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.force) {
      // Clear the idempotency markers for this one address only, so the same
      // test inbox can be used repeatedly. Never touches other rows.
      await supabaseAdmin
        .from("email_send_log")
        .delete()
        .eq("template_name", "welcome")
        .ilike("recipient_email", email);
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({ welcome_email_status: "pending", welcome_email_error: null })
        .ilike("email", email);
    }

    const { sendWelcomeEmailTo } = await import("@/lib/welcome-email.functions");
    const res = await sendWelcomeEmailTo(email, null, null);
    console.info("[welcome] admin test", { outcome: res.outcome });
    return res;
  });

/** Admin: which Broadcast is wired up (id only, no secrets). */
export const adminWelcomeConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const broadcastId = process.env["RESEND_WELCOME_BROADCAST_ID"] ?? null;
    const audienceConfigured = Boolean(process.env["RESEND_AUDIENCE_ID"]);
    const apiKeyConfigured = Boolean(process.env["RESEND_API_KEY"]);
    if (!broadcastId) return { broadcastId, audienceConfigured, apiKeyConfigured, name: null, subject: null };
    try {
      const { getBroadcast } = await import("@/lib/resend.server");
      const b = await getBroadcast(broadcastId);
      return {
        broadcastId,
        audienceConfigured,
        apiKeyConfigured,
        name: b.name ?? null,
        subject: b.subject ?? null,
      };
    } catch {
      return { broadcastId, audienceConfigured, apiKeyConfigured, name: null, subject: null };
    }
  });

/** Admin: safely retry one definitively failed PepHub Automation event. */
export const adminRetryPepHubWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subscriberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscriber } = await supabaseAdmin
      .from("marketing_subscribers")
      .select("id, user_id, pephub_welcome_status")
      .eq("id", data.subscriberId)
      .maybeSingle();
    if (!subscriber?.user_id) throw new Error("This subscriber is not linked to a PepHub account.");
    if (subscriber.pephub_welcome_status !== "failed") {
      return { outcome: "already_triggered" as const };
    }
    const { triggerPepHubWelcome } = await import("@/lib/pephub-welcome.server");
    return triggerPepHubWelcome({ subscriberId: subscriber.id, userId: subscriber.user_id });
  });

/** Admin: safely retry one definitively failed Titan Elite Automation event. */
export const adminRetryTitanEliteWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subscriberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscriber } = await supabaseAdmin
      .from("marketing_subscribers")
      .select("id, email, first_name, last_name, user_id, titanelite_welcome_status")
      .eq("id", data.subscriberId)
      .maybeSingle();
    if (!subscriber) throw new Error("Subscriber not found.");
    if (subscriber.titanelite_welcome_status !== "failed") {
      return { outcome: "already_triggered" as const };
    }
    const { triggerTitanEliteWelcome } = await import("@/lib/titanelite-welcome.server");
    console.info("[titanelite welcome] admin retry", { subscriberId: subscriber.id });
    return triggerTitanEliteWelcome({
      email: subscriber.email,
      name: [subscriber.first_name, subscriber.last_name].filter(Boolean).join(" "),
      userId: subscriber.user_id,
    });
  });
