import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
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

/** Client: full conversation with the coaching team. */
export const listMyMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await hasFullAccess(supabase, userId))) {
      return { allowed: false as const, messages: [] as Msg[] };
    }
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { allowed: true as const, messages: (data ?? []) as Msg[] };
  });

/** Client: send a message to the coach (first admin account). */
export const sendMessageToCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ body: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await hasFullAccess(supabase, userId))) throw new Error("Full Access required to message your coach.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: admins } = await admin
      .from("user_roles").select("user_id").eq("role", "admin").order("created_at", { ascending: true }).limit(1);
    const coachId = admins?.[0]?.user_id as string | undefined;
    if (!coachId) throw new Error("No coach account is available right now.");

    const { error } = await admin.from("messages").insert({
      sender_id: userId, recipient_id: coachId, body: data.body.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list one row per client conversation. */
export const adminListThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: msgs, error } = await admin
      .from("messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const adminIds = new Set<string>();
    const { data: adminRows } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    (adminRows ?? []).forEach((r: { user_id: string }) => adminIds.add(r.user_id));

    const threads = new Map<string, { userId: string; lastBody: string; lastAt: string; unread: number }>();
    for (const m of (msgs ?? []) as Msg[]) {
      const clientId = adminIds.has(m.sender_id) ? m.recipient_id : m.sender_id;
      if (adminIds.has(clientId)) continue;
      const t = threads.get(clientId);
      if (!t) {
        threads.set(clientId, {
          userId: clientId,
          lastBody: m.body,
          lastAt: m.created_at,
          unread: !m.read_at && !adminIds.has(m.sender_id) ? 1 : 0,
        });
      } else if (!m.read_at && !adminIds.has(m.sender_id)) {
        t.unread += 1;
      }
    }

    const ids = [...threads.keys()];
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: p } = await admin.from("profiles").select("id, full_name, email").in("id", ids);
      profiles = Object.fromEntries((p ?? []).map((r: { id: string; full_name: string | null; email: string | null }) => [r.id, r]));
    }

    return {
      threads: [...threads.values()]
        .map((t) => ({
          ...t,
          fullName: profiles[t.userId]?.full_name ?? null,
          email: profiles[t.userId]?.email ?? null,
        }))
        .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)),
    };
  });

/** Admin: full conversation with a client (also marks client messages read). */
export const adminListThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: msgs, error } = await admin
      .from("messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${data.clientId},recipient_id.eq.${data.clientId}`)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    await admin.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", data.clientId)
      .is("read_at", null);

    return { messages: (msgs ?? []) as Msg[] };
  });

/** Admin: reply to a client. */
export const adminSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { error } = await admin.from("messages").insert({
      sender_id: userId, recipient_id: data.clientId, body: data.body.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list clients with Full Access, to start a new conversation. */
export const adminListMessageableClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: access } = await admin.from("user_access").select("user_id, tier").eq("tier", "full");
    const ids = [...new Set(((access ?? []) as { user_id: string }[]).map((a) => a.user_id))];
    if (!ids.length) return { clients: [] as Array<{ id: string; full_name: string | null; email: string | null }> };
    const { data: p } = await admin.from("profiles").select("id, full_name, email").in("id", ids);
    return { clients: (p ?? []) as Array<{ id: string; full_name: string | null; email: string | null }> };
  });
