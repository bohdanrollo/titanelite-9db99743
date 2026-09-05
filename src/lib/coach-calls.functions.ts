import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CoachCall = {
  id: string;
  topic: string;
  requested_start: string;
  approved_start: string | null;
  duration_minutes: number;
  notes: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export type AdminCoachCall = CoachCall & {
  user_id: string;
  client_name: string | null;
  client_email: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hasFullAccess(supabase: any, userId: string) {
  if (await isAdmin(supabase, userId)) return true;
  const { data } = await supabase
    .from("user_access").select("tier").eq("user_id", userId).eq("tier", "full").limit(1);
  return !!(data && data.length);
}

/** Client: list my call requests. */
export const listMyCoachCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await hasFullAccess(supabase, userId))) {
      return { allowed: false as const, calls: [] as CoachCall[] };
    }
    const { data, error } = await supabase
      .from("coach_calls")
      .select("id, topic, requested_start, approved_start, duration_minutes, notes, status, admin_notes, created_at")
      .eq("user_id", userId)
      .order("requested_start", { ascending: false });
    if (error) throw new Error(error.message);
    return { allowed: true as const, calls: (data ?? []) as CoachCall[] };
  });

/** Client: request a 30-minute coach call. */
export const requestCoachCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        topic: z.enum(["fitness", "peptides"]),
        startIso: z.string().min(10),
        localWeekday: z.number().int().min(0).max(6),
        localMinutes: z.number().int().min(0).max(1439),
        notes: z.string().trim().min(5).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await hasFullAccess(supabase, userId))) throw new Error("Full Access required to book a coach call.");

    const start = new Date(data.startIso);
    if (Number.isNaN(start.getTime())) throw new Error("Invalid date or time.");
    if (start.getTime() - Date.now() < 48 * 60 * 60 * 1000) {
      throw new Error("Calls must be scheduled at least 48 hours in advance.");
    }
    if (data.localWeekday === 0 || data.localWeekday === 6) {
      throw new Error("Calls are only available on weekdays.");
    }
    // 8:00 AM start through 7:30 PM start (ends by 8:00 PM), in 30-minute steps.
    if (data.localMinutes < 8 * 60 || data.localMinutes > 19 * 60 + 30 || data.localMinutes % 30 !== 0) {
      throw new Error("Calls must start between 8:00 AM and 7:30 PM, on the hour or half hour.");
    }

    const { data: pending } = await supabase
      .from("coach_calls").select("id").eq("user_id", userId).eq("status", "pending").limit(1);
    if (pending && pending.length) throw new Error("You already have a call request awaiting approval.");

    // One accepted call per calendar month (based on the requested call's month).
    const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const { data: accepted } = await supabase
      .from("coach_calls")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["approved", "completed"])
      .gte("requested_start", monthStart.toISOString())
      .lt("requested_start", monthEnd.toISOString())
      .limit(1);
    if (accepted && accepted.length) {
      throw new Error("You already have an accepted call this month. You can schedule your next call next month.");
    }

    const { error } = await supabase.from("coach_calls").insert({
      user_id: userId,
      topic: data.topic,
      requested_start: start.toISOString(),
      notes: data.notes.trim(),
      status: "pending",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Client: cancel one of my own requests. */
export const cancelMyCoachCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("coach_calls").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list every call request with requester details. */
export const adminListCoachCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: rows, error } = await admin
      .from("coach_calls")
      .select("id, user_id, topic, requested_start, approved_start, duration_minutes, notes, status, admin_notes, created_at")
      .order("requested_start", { ascending: true });
    if (error) throw new Error(error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: ps } = await admin.from("profiles").select("id, full_name, email").in("id", ids);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profiles = Object.fromEntries((ps ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calls: (rows ?? []).map((r: any) => ({
        ...r,
        client_name: profiles[r.user_id]?.full_name ?? null,
        client_email: profiles[r.user_id]?.email ?? null,
      })) as AdminCoachCall[],
    };
  });

/** Admin: approve (optionally at a different time), decline, or complete a call. */
export const reviewCoachCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approved", "declined", "completed", "pending"]),
        approvedStartIso: z.string().optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const patch: Record<string, unknown> = { status: data.action, reviewed_at: new Date().toISOString() };
    if (data.notes !== undefined) patch.admin_notes = data.notes || null;
    if (data.action === "approved") {
      if (data.approvedStartIso) {
        const d = new Date(data.approvedStartIso);
        if (Number.isNaN(d.getTime())) throw new Error("Invalid time.");
        patch.approved_start = d.toISOString();
      } else {
        const { data: row } = await admin.from("coach_calls").select("requested_start").eq("id", data.id).maybeSingle();
        patch.approved_start = row?.requested_start ?? null;
      }
    }
    const { error } = await admin.from("coach_calls").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete a call request. */
export const deleteCoachCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("coach_calls").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
