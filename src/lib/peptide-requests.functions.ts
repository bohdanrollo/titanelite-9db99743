import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin role required");
}

/** Client: submit a request for a peptide to be added to the dosing guide. */
export const submitPeptideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        peptideName: z.string().trim().min(2).max(120),
        reason: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("peptide_requests").insert({
      user_id: context.userId,
      peptide_name: data.peptideName,
      reason: data.reason || null,
      status: "new",
    } as never);
    if (error) throw error;
    return { ok: true };
  });

/** Client: list own peptide requests. */
export const listMyPeptideRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("peptide_requests")
      .select("id, peptide_name, reason, status, admin_notes, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { requests: data ?? [] };
  });

/** Admin: list every peptide request with requester details. */
export const adminListPeptideRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("peptide_requests")
      .select("id, user_id, peptide_name, reason, status, admin_notes, reviewed_at, created_at")
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: ps } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      profiles = Object.fromEntries((ps ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
    }

    return {
      requests: (rows ?? []).map((r: any) => ({
        ...r,
        client_name: profiles[r.user_id]?.full_name ?? null,
        client_email: profiles[r.user_id]?.email ?? null,
      })),
    };
  });

/** Admin: mark a peptide request added or declined. */
export const reviewPeptideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["added", "declined", "new"]),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.action, reviewed_at: new Date().toISOString() };
    if (data.notes) patch.admin_notes = data.notes;
    const { error } = await (supabaseAdmin as any).from("peptide_requests").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Admin: delete a peptide request. */
export const deletePeptideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("peptide_requests").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
