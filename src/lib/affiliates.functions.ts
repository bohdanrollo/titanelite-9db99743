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

/** Record a referral for a newly signed-up user via ?ref=CODE */
export const recordReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const code = normalizeCode(data.code);
    if (!code) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: aff } = await supabaseAdmin
      .from("affiliates")
      .select("id, user_id, status")
      .eq("code", code)
      .eq("status", "approved")
      .maybeSingle();
    if (!aff) return { ok: false };
    // Don't credit self-referrals
    if (aff.user_id === context.userId) return { ok: false };
    // Ignore duplicates (unique constraint on referred_user_id)
    const { error } = await supabaseAdmin
      .from("affiliate_referrals")
      .insert({ affiliate_id: aff.id, referred_user_id: context.userId, code_used: code });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

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

/** Admin: mark earnings as paid out (resets earnings_cents to 0 but keeps referral history) */
export const markAffiliatePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("affiliates").update({ earnings_cents: 0 }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Public: read current payout rate ($ paid per 5 signups) */
export const getAffiliatePayoutRate = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "affiliate_payout_cents_per_5")
      .maybeSingle();
    const cents = (data?.value_int as number | null) ?? 2500;
    return { cents };
  });

/** Admin: set payout rate ($ per 5 signups) and recompute all affiliate balances */
export const setAffiliatePayoutRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    amountDollars: z.number().min(0).max(1000000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cents = Math.round(data.amountDollars * 100);
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "affiliate_payout_cents_per_5", value_int: cents, updated_at: new Date().toISOString() });
    if (error) throw error;
    const { error: rpcErr } = await supabaseAdmin.rpc("recompute_all_affiliate_totals" as never);
    if (rpcErr) throw rpcErr;
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
