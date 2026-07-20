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
