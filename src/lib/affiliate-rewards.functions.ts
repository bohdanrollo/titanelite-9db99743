import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Every 15 driven signups unlocks $100 in free product from PBL. */
export const SIGNUPS_PER_PRODUCT_REWARD = 15;
export const PRODUCT_REWARD_CENTS = 10000;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin role required");
}

/** Affiliate: eligibility + own request history. */
export const getMyProductRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ affiliateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: aff } = await context.supabase
      .from("affiliates")
      .select("id, referral_count, status")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!aff) throw new Error("Affiliate not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("affiliate_product_requests")
      .select("id, amount_cents, referral_count_at_request, notes, shipping_address, status, admin_notes, reviewed_at, fulfilled_at, created_at")
      .eq("affiliate_id", data.affiliateId)
      .order("created_at", { ascending: false });

    const requests = rows ?? [];
    const referralCount = aff.referral_count ?? 0;
    const earned = Math.floor(referralCount / SIGNUPS_PER_PRODUCT_REWARD);
    const used = requests.filter((r: any) => r.status !== "declined").length;
    const available = Math.max(earned - used, 0);
    const toNext = SIGNUPS_PER_PRODUCT_REWARD - (referralCount % SIGNUPS_PER_PRODUCT_REWARD);

    return { requests, referralCount, earned, used, available, toNext };
  });

/** Affiliate: request a $100 free product credit. */
export const requestProductReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        affiliateId: z.string().uuid(),
        shippingAddress: z.string().trim().min(5).max(500),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: aff } = await context.supabase
      .from("affiliates")
      .select("id, status, referral_count")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!aff || aff.status !== "approved") throw new Error("Only approved affiliates can request product");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("affiliate_product_requests")
      .select("id, status")
      .eq("affiliate_id", data.affiliateId);

    const earned = Math.floor((aff.referral_count ?? 0) / SIGNUPS_PER_PRODUCT_REWARD);
    const used = (rows ?? []).filter((r: any) => r.status !== "declined").length;
    if (earned - used <= 0) throw new Error("No product credit available yet — 15 driven signups unlocks $100.");

    const { error } = await (supabaseAdmin as any).from("affiliate_product_requests").insert({
      affiliate_id: data.affiliateId,
      amount_cents: PRODUCT_REWARD_CENTS,
      referral_count_at_request: aff.referral_count ?? 0,
      shipping_address: data.shippingAddress,
      notes: data.notes || null,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true };
  });

/** Admin: list every product reward request. */
export const adminListProductRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("affiliate_product_requests")
      .select("id, affiliate_id, amount_cents, referral_count_at_request, notes, shipping_address, status, admin_notes, reviewed_at, fulfilled_at, created_at")
      .order("created_at", { ascending: false });

    const affIds = Array.from(new Set((rows ?? []).map((r: any) => r.affiliate_id)));
    let affiliates: Record<string, { full_name: string | null; email: string; code: string | null; referral_count: number }> = {};
    if (affIds.length) {
      const { data: affs } = await (supabaseAdmin as any)
        .from("affiliates")
        .select("id, full_name, email, code, referral_count")
        .in("id", affIds);
      affiliates = Object.fromEntries(
        (affs ?? []).map((a: any) => [a.id, { full_name: a.full_name, email: a.email, code: a.code, referral_count: a.referral_count }]),
      );
    }

    return {
      requests: (rows ?? []).map((r: any) => ({
        ...r,
        affiliate_name: affiliates[r.affiliate_id]?.full_name ?? null,
        affiliate_email: affiliates[r.affiliate_id]?.email ?? null,
        affiliate_code: affiliates[r.affiliate_id]?.code ?? null,
        affiliate_referrals: affiliates[r.affiliate_id]?.referral_count ?? 0,
      })),
    };
  });

/** Admin: approve, decline, or mark a product request fulfilled. */
export const reviewProductRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "decline", "fulfill"]),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const status = data.action === "approve" ? "approved" : data.action === "decline" ? "declined" : "fulfilled";
    const patch: Record<string, unknown> = { status, reviewed_at: now };
    if (data.notes) patch.admin_notes = data.notes;
    if (data.action === "fulfill") patch.fulfilled_at = now;

    const { error } = await (supabaseAdmin as any)
      .from("affiliate_product_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, status };
  });
