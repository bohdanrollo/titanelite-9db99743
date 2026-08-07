import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin role required");
}

function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

/** Admin: approve an affiliate application, assign code, link user_id if exists */
export const approveAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    code: z.string().min(2).max(20),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const code = normalizeCode(data.code);
    if (code.length < 2) throw new Error("Code must be at least 2 alphanumeric characters");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check code uniqueness
    const { data: existing } = await supabaseAdmin.from("affiliates").select("id").eq("code", code).neq("id", data.id).maybeSingle();
    if (existing) throw new Error(`Code "${code}" is already in use`);

    // Load application to find matching user by email
    const { data: app } = await supabaseAdmin.from("affiliates").select("email, user_id").eq("id", data.id).maybeSingle();
    if (!app) throw new Error("Application not found");

    let userId = app.user_id as string | null;
    if (!userId && app.email) {
      const { data: userRows } = await supabaseAdmin.from("profiles").select("id, email").ilike("email", app.email).maybeSingle();
      if (userRows) userId = userRows.id;
    }

    const { error } = await supabaseAdmin
      .from("affiliates")
      .update({ status: "approved", code, user_id: userId, approved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;

    // Send approval email (best-effort)
    if (app.email) {
      try {
        const { sendAppEmail } = await import("@/lib/email/send.server");
        const { data: aff } = await supabaseAdmin
          .from("affiliates")
          .select("full_name")
          .eq("id", data.id)
          .maybeSingle();
        await sendAppEmail({
          templateName: "affiliate-approved",
          recipientEmail: app.email,
          idempotencyKey: `affiliate-approved-${data.id}`,
          templateData: {
            name: aff?.full_name || undefined,
            code,
            referralUrl: `https://titanelite.org/?ref=${code}`,
          },
        });
      } catch (e) {
        console.warn("[affiliate approve] email send failed", e);
      }
    }
    return { ok: true, code };
  });

export const rejectAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("affiliates").update({ status: "rejected" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("affiliates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Admin: mark earnings as paid out. Adds current owed to lifetime totals, then resets current balances. */
export const markAffiliatePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: aff, error: readErr } = await (supabaseAdmin as any)
      .from("affiliates")
      .select("earnings_cents, recruit_earnings_cents, video_earnings_cents, lifetime_earnings_cents, lifetime_recruit_earnings_cents, lifetime_video_earnings_cents")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!aff) throw new Error("Affiliate not found");
    const paidAmount = (aff.earnings_cents ?? 0) + (aff.recruit_earnings_cents ?? 0) + (aff.video_earnings_cents ?? 0);
    const { error } = await (supabaseAdmin as any)
      .from("affiliates")
      .update({
        earnings_cents: 0,
        recruit_earnings_cents: 0,
        video_earnings_cents: 0,
        lifetime_earnings_cents: (aff.lifetime_earnings_cents ?? 0) + (aff.earnings_cents ?? 0),
        lifetime_recruit_earnings_cents: (aff.lifetime_recruit_earnings_cents ?? 0) + (aff.recruit_earnings_cents ?? 0),
        lifetime_video_earnings_cents: (aff.lifetime_video_earnings_cents ?? 0) + (aff.video_earnings_cents ?? 0),
        last_paid_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, paidCents: paidAmount };

  });

/** Public: record a click on a referral link. Silently ignores unknown/unapproved codes. */
export const trackAffiliateClick = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    code: z.string().min(1).max(40),
    referrer: z.string().max(500).optional(),
    path: z.string().max(500).optional(),
    userAgent: z.string().max(500).optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const code = normalizeCode(data.code);
    if (!code) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: aff } = await supabaseAdmin
      .from("affiliates")
      .select("id, click_count")
      .eq("code", code)
      .eq("status", "approved")
      .maybeSingle();
    if (!aff) return { ok: false };
    await (supabaseAdmin as any).from("affiliate_clicks").insert({
      affiliate_id: aff.id,
      referrer: data.referrer ?? null,
      path: data.path ?? null,
      user_agent: data.userAgent ?? null,
    });
    await (supabaseAdmin as any)
      .from("affiliates")
      .update({ click_count: ((aff as any).click_count ?? 0) + 1 })
      .eq("id", aff.id);
    return { ok: true };
  });

/** Affiliate: full stats for own dashboard — referred users, driven revenue, clicks. */
export const getMyAffiliateStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ affiliateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: aff } = await context.supabase
      .from("affiliates")
      .select("id, click_count, code")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!aff) throw new Error("Affiliate not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: refs } = await (supabaseAdmin as any)
      .from("affiliate_referrals")
      .select("id, referred_user_id, created_at")
      .eq("affiliate_id", data.affiliateId)
      .order("created_at", { ascending: false });

    const userIds = (refs ?? []).map((r: any) => r.referred_user_id);
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    const revenueByUser: Record<string, number> = {};
    const tierByUser: Record<string, string> = {};
    let totalRevenueCents = 0;

    if (userIds.length) {
      const { data: profs } = await (supabaseAdmin as any)
        .from("profiles").select("id, full_name, email").in("id", userIds);
      profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));

      const { data: purchases } = await (supabaseAdmin as any)
        .from("purchases").select("user_id, amount_cents, status").in("user_id", userIds).eq("status", "paid");
      for (const p of purchases ?? []) {
        revenueByUser[p.user_id] = (revenueByUser[p.user_id] ?? 0) + (p.amount_cents ?? 0);
        totalRevenueCents += p.amount_cents ?? 0;
      }

      // Paid plans are tracked in user_access for the current checkout flow.
      const { data: access } = await (supabaseAdmin as any)
        .from("user_access").select("user_id, tier").in("user_id", userIds);
      for (const a of access ?? []) {
        if (a.tier === "full" || !tierByUser[a.user_id]) tierByUser[a.user_id] = a.tier;
      }
    }

    const referrals = (refs ?? []).map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      full_name: profiles[r.referred_user_id]?.full_name ?? null,
      email: profiles[r.referred_user_id]?.email ?? null,
      revenue_cents: revenueByUser[r.referred_user_id] ?? 0,
      tier: tierByUser[r.referred_user_id] ?? null,
      paid: (revenueByUser[r.referred_user_id] ?? 0) > 0 || !!tierByUser[r.referred_user_id],
    }));

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAll } = await (supabaseAdmin as any)
      .from("affiliate_clicks").select("created_at, referrer, path")
      .eq("affiliate_id", data.affiliateId)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    const clicksByDay: Record<string, number> = {};
    for (const c of recentAll ?? []) {
      const day = new Date(c.created_at).toISOString().slice(0, 10);
      clicksByDay[day] = (clicksByDay[day] ?? 0) + 1;
    }

    const conversionRate = ((aff as any).click_count ?? 0) > 0
      ? (referrals.length / ((aff as any).click_count as number)) * 100
      : 0;

    return {
      referrals,
      totalRevenueCents,
      recentClicks: (recentAll ?? []).slice(0, 30),
      clicksByDay,
      clickCount: (aff as any).click_count ?? 0,
      last30Clicks: (recentAll ?? []).length,
      conversionRate,
    };
  });

/** Resolve a recruiter code (used at application time) → returns approved affiliate id, or null */
export const resolveRecruiterCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const code = normalizeCode(data.code);
    if (!code) return { affiliateId: null as string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: aff } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("code", code)
      .eq("status", "approved")
      .maybeSingle();
    return { affiliateId: aff?.id ?? null };
  });

/** Admin: set a single affiliate's payout rate ($ per 5 signups). Only applies to future referrals. */
export const setAffiliatePayoutRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    amountDollars: z.number().min(0).max(1000000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cents = Math.round(data.amountDollars * 100);
    const { error } = await (supabaseAdmin as any)
      .from("affiliates")
      .update({ payout_cents_per_5: cents, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, cents };
  });


/** Admin: resend approval email to all approved affiliates */
export const resendApprovedAffiliateEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendAppEmail } = await import("@/lib/email/send.server");
    const { data: approved } = await supabaseAdmin
      .from("affiliates")
      .select("id, email, full_name, code")
      .eq("status", "approved");
    let sent = 0;
    for (const a of approved ?? []) {
      if (!a.email || !a.code) continue;
      await sendAppEmail({
        templateName: "affiliate-approved",
        recipientEmail: a.email,
        idempotencyKey: `affiliate-approved-resend-${a.id}-${Date.now()}`,
        templateData: {
          name: a.full_name || undefined,
          code: a.code,
          referralUrl: `https://titanelite.org/?ref=${a.code}`,
        },
      });
      sent++;
    }
    return { ok: true, sent };
  });
