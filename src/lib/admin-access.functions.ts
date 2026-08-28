import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin gate is performed inline via user_roles lookups below.

export const grantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid(),
      tier: z.enum(["limited", "full"]),
      environment: z.enum(["sandbox", "live"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Strict admin check
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data: existing } = await admin
      .from("user_access")
      .select("id, tier")
      .eq("user_id", data.userId)
      .eq("environment", data.environment)
      .maybeSingle();

    if (existing) {
      if (existing.tier === data.tier) {
        return { ok: true, action: "unchanged" as const };
      }
      const { error } = await admin
        .from("user_access")
        .update({ tier: data.tier, stripe_price_id: "admin_comp", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, action: "updated" as const };
    }


    const { error } = await admin.from("user_access").insert({
      user_id: data.userId,
      tier: data.tier,
      stripe_price_id: "admin_comp",
      environment: data.environment,
    });
    if (error) throw new Error(error.message);
    return { ok: true, action: "created" as const };
  });

export const revokeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid(),
      environment: z.enum(["sandbox", "live"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { error } = await admin
      .from("user_access")
      .delete()
      .eq("user_id", data.userId)
      .eq("environment", data.environment);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ environment: z.enum(["sandbox", "live"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    // Return access rows across BOTH environments. Live purchases must still
    // show up when the admin dashboard is viewed in preview (sandbox) mode.
    void data.environment;
    const { data: rows, error } = await admin
      .from("user_access")
      .select("user_id, tier, stripe_price_id, environment, created_at, updated_at");
    if (error) throw new Error(error.message);
    return { rows: rows as Array<{ user_id: string; tier: "limited" | "full"; stripe_price_id: string | null; environment: string; created_at: string; updated_at: string }> };
  });

export const grantFullAccessByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    const email = data.email.trim().toLowerCase();
    const { provisionAffiliateAccount } = await import("@/lib/affiliate-provision.server");
    // Creates a confirmed, password-less account when none exists (the user
    // then sets a password via "Set / reset password" on /auth) and grants
    // full access in both environments.
    const { userId: targetUserId, created } = await provisionAffiliateAccount(email);
    if (!targetUserId) throw new Error(`Could not create or find an account for ${email}.`);
    return { ok: true, userId: targetUserId, granted: 2, created };
  });

