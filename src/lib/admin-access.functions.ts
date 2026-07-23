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
      // Never downgrade full → limited via comp; require explicit revoke first.
      if (existing.tier === "full" && data.tier === "limited") {
        throw new Error("User already has Full access. Revoke first to downgrade.");
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
    const { data: rows, error } = await admin
      .from("user_access")
      .select("user_id, tier, stripe_price_id, environment, created_at, updated_at")
      .eq("environment", data.environment);
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const email = data.email.trim().toLowerCase();
    // Find user by email via profiles first
    const { data: profile } = await admin
      .from("profiles").select("id").ilike("email", email).maybeSingle();
    let targetUserId: string | null = profile?.id ?? null;

    if (!targetUserId) {
      // Fallback: search auth users
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) throw new Error(listErr.message);
      const match = list?.users?.find((u: { email?: string | null }) => (u.email ?? "").toLowerCase() === email);
      if (!match) throw new Error(`No account found for ${email}. Ask them to sign up first.`);
      targetUserId = match.id;
    }

    let granted = 0;
    for (const environment of ["sandbox", "live"] as const) {
      const { data: existing } = await admin
        .from("user_access")
        .select("id, tier")
        .eq("user_id", targetUserId)
        .eq("environment", environment)
        .maybeSingle();
      if (existing) {
        if (existing.tier === "full") continue;
        const { error } = await admin.from("user_access")
          .update({ tier: "full", stripe_price_id: "affiliate_comp", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await admin.from("user_access").insert({
          user_id: targetUserId, tier: "full", stripe_price_id: "affiliate_comp", environment,
        });
        if (error) throw new Error(error.message);
      }
      granted++;
    }
    return { ok: true, userId: targetUserId, granted };
  });
