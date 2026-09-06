import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PepSource = {
  id: string;
  name: string;
  url: string;
  affiliate_url: string | null;
  description: string | null;
  category: string | null;
  discount_code: string | null;
  logo_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  facebook_url: string | null;
  telegram_url: string | null;
  reddit_url: string | null;
  other_social_url: string | null;
  monitor_socials: boolean;
  newsletter_signup_url: string | null;
  newsletter_email_domains: string | null;
  newsletter_subscribed: boolean;
  is_active: boolean;
  expert_verified: boolean;
  listing_category: "featured" | "trusted" | "more";
  sort_order: number;
  created_at: string;
};

export type PepMember = {
  id: string;
  name: string;
  email: string;
  subscribed: boolean;
  created_at: string;
};

export type PepAlert = {
  id: string;
  source_id: string | null;
  headline: string;
  details: string | null;
  promo_code: string | null;
  recipients: number;
  sent_at: string;
};

/** Public: join PepHub with name + email. */
export const joinPepHub = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { error } = await supabaseAdmin
      .from("pephub_members")
      .upsert(
        { name: data.name, email, subscribed: true, unsubscribed_at: null },
        { onConflict: "email" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

/** Admin: list PepHub members. */
export const adminListPepHubMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pephub_members")
      .select("id, name, email, subscribed, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return { members: (data ?? []) as PepMember[] };
  });

/** Admin: remove a PepHub member. */
export const adminDeletePepHubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pephub_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list every source (including inactive). */
export const adminListSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pephub_sources")
      .select("id, name, url, affiliate_url, description, category, discount_code, logo_url, instagram_url, x_url, facebook_url, telegram_url, reddit_url, other_social_url, monitor_socials, newsletter_signup_url, newsletter_email_domains, newsletter_subscribed, is_active, expert_verified, listing_category, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { sources: (data ?? []) as PepSource[] };
  });

const sourceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(500),
  affiliate_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  discount_code: z.string().trim().max(60).optional().nullable(),
  logo_url: z.string().trim().max(500).optional().nullable(),
  instagram_url: z.string().trim().max(500).optional().nullable(),
  x_url: z.string().trim().max(500).optional().nullable(),
  facebook_url: z.string().trim().max(500).optional().nullable(),
  telegram_url: z.string().trim().max(500).optional().nullable(),
  reddit_url: z.string().trim().max(500).optional().nullable(),
  other_social_url: z.string().trim().max(500).optional().nullable(),
  monitor_socials: z.boolean().default(true),
  newsletter_signup_url: z.string().trim().max(500).optional().nullable(),
  newsletter_email_domains: z.string().trim().max(500).optional().nullable(),
  newsletter_subscribed: z.boolean().default(false),
  is_active: z.boolean().default(true),
  expert_verified: z.boolean().default(false),
  listing_category: z.enum(["featured", "trusted", "more"]).default("trusted"),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

/** Admin: create or update a trusted source. */
export const adminSaveSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sourceInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      name: data.name,
      url: data.url,
      affiliate_url: data.affiliate_url || null,
      description: data.description || null,
      category: data.category || null,
      discount_code: data.discount_code || null,
      logo_url: data.logo_url || null,
      instagram_url: data.instagram_url || null,
      x_url: data.x_url || null,
      facebook_url: data.facebook_url || null,
      telegram_url: data.telegram_url || null,
      reddit_url: data.reddit_url || null,
      other_social_url: data.other_social_url || null,
      monitor_socials: data.monitor_socials,
      newsletter_signup_url: data.newsletter_signup_url || null,
      newsletter_email_domains: data.newsletter_email_domains || null,
      newsletter_subscribed: data.newsletter_subscribed,
      is_active: data.is_active,
      expert_verified: data.expert_verified,
      listing_category: data.listing_category,
      sort_order: data.sort_order,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("pephub_sources").update(row).eq("id", data.id)
      : await supabaseAdmin.from("pephub_sources").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete a source. */
export const adminDeleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pephub_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: email every subscribed PepHub member about a source sale/discount. */
export const adminSendDealAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sourceId: z.string().uuid(),
        headline: z.string().trim().min(1).max(160),
        details: z.string().trim().max(2000).optional(),
        promoCode: z.string().trim().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendAppEmail } = await import("@/lib/email/send.server");

    const { data: source, error: srcErr } = await supabaseAdmin
      .from("pephub_sources")
      .select("id, name, url, affiliate_url, discount_code")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (srcErr) throw new Error(srcErr.message);
    if (!source) throw new Error("Source not found");

    const { data: members, error: memErr } = await supabaseAdmin
      .from("pephub_members")
      .select("name, email")
      .eq("subscribed", true);
    if (memErr) throw new Error(memErr.message);

    const promo = data.promoCode || source.discount_code || undefined;
    const stamp = Date.now();
    let sent = 0;
    for (const m of members ?? []) {
      const res = await sendAppEmail({
        templateName: "pephub-deal",
        recipientEmail: m.email,
        idempotencyKey: `pephub-deal-${source.id}-${stamp}-${m.email}`,
        templateData: {
          name: m.name,
          sourceName: source.name,
          sourceUrl: source.affiliate_url || source.url,
          headline: data.headline,
          details: data.details ?? "",
          promoCode: promo ?? "",
        },
      });
      if (res.queued) sent += 1;
    }

    await supabaseAdmin.from("pephub_source_alerts").insert({
      source_id: source.id,
      headline: data.headline,
      details: data.details || null,
      promo_code: promo || null,
      recipients: sent,
    });

    return { sent, total: (members ?? []).length };
  });

/** Admin: recent sale alerts. */
export const adminListDealAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pephub_source_alerts")
      .select("id, source_id, headline, details, promo_code, recipients, sent_at")
      .order("sent_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { alerts: (data ?? []) as PepAlert[] };
  });

/** Admin: upload a source logo image (private bucket, served via public route). */
export const adminUploadSourceLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        filename: z.string().trim().min(1).max(200),
        contentType: z.string().trim().min(3).max(100),
        dataBase64: z.string().min(10).max(8_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (!data.contentType.startsWith("image/")) throw new Error("Only image files are allowed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (data.filename.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `${crypto.randomUUID()}.${ext || "png"}`;
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));

    const { error } = await supabaseAdmin.storage
      .from("pephub-logos")
      .upload(key, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);

    return { url: `/api/public/pephub/logo/${key}` };
  });
