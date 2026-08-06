import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const VIDEO_RATE_CENTS_PER_1000 = 500;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin role required");
}

/** Affiliate: submit a video link for the $5 / 1,000 views incentive. */
export const submitAffiliateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        affiliateId: z.string().uuid(),
        url: z.string().trim().url({ message: "Enter a valid video URL" }).max(500),
        platform: z.string().trim().max(40).optional(),
        claimedViews: z.number().int().min(0).max(1_000_000_000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS check: caller must own this approved affiliate row
    const { data: aff } = await context.supabase
      .from("affiliates")
      .select("id, status")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!aff || aff.status !== "approved") throw new Error("Only approved affiliates can submit videos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("affiliate_videos").insert({
      affiliate_id: data.affiliateId,
      url: data.url,
      platform: data.platform || null,
      claimed_views: data.claimedViews ?? 0,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true };
  });

/** Affiliate: list own video submissions. */
export const listMyAffiliateVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ affiliateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: aff } = await context.supabase
      .from("affiliates")
      .select("id")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!aff) throw new Error("Affiliate not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("affiliate_videos")
      .select("id, url, platform, claimed_views, approved_views, status, payout_cents, admin_notes, reviewed_at, created_at")
      .eq("affiliate_id", data.affiliateId)
      .order("created_at", { ascending: false });
    return { videos: rows ?? [] };
  });

/** Admin: list every video submission with affiliate details. */
export const adminListAffiliateVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("affiliate_videos")
      .select("id, affiliate_id, url, platform, claimed_views, approved_views, status, payout_cents, admin_notes, reviewed_at, created_at")
      .order("created_at", { ascending: false });
    const affIds = Array.from(new Set((rows ?? []).map((r: any) => r.affiliate_id)));
    let affiliates: Record<string, { full_name: string | null; email: string; code: string | null }> = {};
    if (affIds.length) {
      const { data: affs } = await (supabaseAdmin as any)
        .from("affiliates")
        .select("id, full_name, email, code")
        .in("id", affIds);
      affiliates = Object.fromEntries((affs ?? []).map((a: any) => [a.id, { full_name: a.full_name, email: a.email, code: a.code }]));
    }
    return {
      videos: (rows ?? []).map((r: any) => ({
        ...r,
        affiliate_name: affiliates[r.affiliate_id]?.full_name ?? null,
        affiliate_email: affiliates[r.affiliate_id]?.email ?? null,
        affiliate_code: affiliates[r.affiliate_id]?.code ?? null,
      })),
    };
  });

/** Admin: approve (with verified views) or decline a video submission. */
export const reviewAffiliateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "decline"]),
        approvedViews: z.number().int().min(0).max(1_000_000_000).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: video } = await (supabaseAdmin as any)
      .from("affiliate_videos")
      .select("id, affiliate_id, status, payout_cents, claimed_views")
      .eq("id", data.id)
      .maybeSingle();
    if (!video) throw new Error("Video not found");
    if (video.status === "approved") throw new Error("This video has already been approved");

    if (data.action === "decline") {
      const { error } = await (supabaseAdmin as any)
        .from("affiliate_videos")
        .update({ status: "declined", admin_notes: data.notes ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
      return { ok: true, payoutCents: 0 };
    }

    const views = data.approvedViews ?? video.claimed_views ?? 0;
    const payoutCents = Math.floor(views / 1000) * VIDEO_RATE_CENTS_PER_1000;

    const { error: updErr } = await (supabaseAdmin as any)
      .from("affiliate_videos")
      .update({
        status: "approved",
        approved_views: views,
        payout_cents: payoutCents,
        admin_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (updErr) throw updErr;

    if (payoutCents > 0) {
      const { data: aff } = await (supabaseAdmin as any)
        .from("affiliates")
        .select("video_earnings_cents")
        .eq("id", video.affiliate_id)
        .maybeSingle();
      const { error: affErr } = await (supabaseAdmin as any)
        .from("affiliates")
        .update({ video_earnings_cents: (aff?.video_earnings_cents ?? 0) + payoutCents, updated_at: new Date().toISOString() })
        .eq("id", video.affiliate_id);
      if (affErr) throw affErr;
    }

    return { ok: true, payoutCents };
  });
