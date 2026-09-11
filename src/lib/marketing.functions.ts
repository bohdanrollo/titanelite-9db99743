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
        "id, user_id, email, first_name, last_name, subscribed, source, resend_contact_id, resend_sync_status, resend_sync_error, resend_last_synced_at, migrated_to_resend, created_at",
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
