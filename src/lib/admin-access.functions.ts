import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  userId: string,
) {
  const { data, error } = await supabase.rpc("has_access", { _user_id: userId, _min_tier: "full" });
  // has_access returns true for admins; but we want a strict admin gate here.
  // Use user_roles directly instead.
  void data; void error;
}

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
    void assertAdmin;
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
