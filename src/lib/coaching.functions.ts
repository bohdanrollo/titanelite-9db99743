import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_TZ, minutesOfDay, zonedParts } from "@/lib/tz";

export type Coach = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  profile_photo: string | null;
  specialty: "fitness" | "peptide" | "hybrid";
  status: "pending" | "approved" | "suspended" | "inactive";
  timezone: string;
  created_at: string;
};

export type Availability = {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
};

export type Appointment = {
  id: string;
  coach_id: string;
  client_id: string;
  call_type: string;
  specialty: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  coach_name?: string | null;
  coach_specialty?: string | null;
  client_name?: string | null;
  client_email?: string | null;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  related_call_id: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  if (!(await isAdmin(supabase, userId))) throw new Error("Admin only");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function profilesFor(db: any, ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {} as Record<string, { full_name: string | null; email: string | null }>;
  const { data } = await db.from("profiles").select("id, full_name, email").in("id", unique);
  return Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]),
  ) as Record<string, { full_name: string | null; email: string | null }>;
}

function specialtyMatches(specialty: string, callType: string) {
  return specialty === "hybrid" || specialty === callType;
}

function hhmmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Full server-side validation for one appointment slot. Throws on any failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateSlot(db: any, opts: {
  coachId: string;
  callType: string;
  startIso: string;
  duration: number;
  ignoreId?: string;
}) {
  const start = new Date(opts.startIso);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid date or time.");
  if (![15, 30, 45, 60, 90].includes(opts.duration)) throw new Error("Invalid call duration.");

  const { data: coach } = await db
    .from("coaches").select("id, first_name, last_name, specialty, status, timezone, user_id")
    .eq("id", opts.coachId).maybeSingle();
  if (!coach) throw new Error("Coach not found.");
  if (coach.status !== "approved") throw new Error("That coach is not approved for scheduling.");
  if (!specialtyMatches(coach.specialty, opts.callType)) {
    throw new Error("That coach's specialty doesn't cover this call type.");
  }

  const tz: string = coach.timezone || DEFAULT_TZ;
  const parts = zonedParts(start, tz);
  const dow = parts.weekday;
  if (dow === 0 || dow === 6) throw new Error("Calls can only be booked Monday through Friday.");

  const { data: avail } = await db
    .from("coach_availability").select("is_available, start_time, end_time")
    .eq("coach_id", opts.coachId).eq("day_of_week", dow).maybeSingle();
  if (!avail || !avail.is_available) throw new Error("The coach isn't available on that day.");

  const startMin = minutesOfDay(start, tz);
  const endMin = startMin + opts.duration;
  if (startMin < hhmmToMinutes(avail.start_time) || endMin > hhmmToMinutes(avail.end_time)) {
    throw new Error("That time falls outside the coach's availability hours.");
  }

  const end = new Date(start.getTime() + opts.duration * 60000);
  let q = db
    .from("coach_appointments")
    .select("id, start_time, end_time")
    .eq("coach_id", opts.coachId)
    .in("status", ["upcoming", "completed"])
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());
  if (opts.ignoreId) q = q.neq("id", opts.ignoreId);
  const { data: clash } = await q.limit(1);
  if (clash && clash.length) throw new Error("The coach already has a call booked during that time.");

  return { coach, start, end, tz };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notify(db: any, rows: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_call_id?: string | null;
  send_after?: string;
}[]) {
  if (!rows.length) return;
  await db.from("notifications").insert(rows);
}

function reminderRows(userId: string, callId: string, start: Date, title: string) {
  const out: { user_id: string; type: string; title: string; message: string; related_call_id: string; send_after: string }[] = [];
  const day = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const hour = new Date(start.getTime() - 60 * 60 * 1000);
  if (day.getTime() > Date.now()) {
    out.push({ user_id: userId, type: "reminder_24h", title: "Call tomorrow", message: `${title} — tomorrow.`, related_call_id: callId, send_after: day.toISOString() });
  }
  if (hour.getTime() > Date.now()) {
    out.push({ user_id: userId, type: "reminder_1h", title: "Call in 1 hour", message: `${title} — in 1 hour.`, related_call_id: callId, send_after: hour.toISOString() });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* coach: profile + availability                                       */
/* ------------------------------------------------------------------ */

export const getMyCoachProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: coach } = await supabase
      .from("coaches").select("*").eq("user_id", userId).maybeSingle();
    if (!coach) return { coach: null, availability: [] as Availability[], isAdmin: await isAdmin(supabase, userId) };
    const { data: avail } = await supabase
      .from("coach_availability").select("day_of_week, is_available, start_time, end_time")
      .eq("coach_id", (coach as { id: string }).id).order("day_of_week");
    return {
      coach: coach as unknown as Coach,
      availability: (avail ?? []) as unknown as Availability[],
      isAdmin: await isAdmin(supabase, userId),
    };
  });

export const saveMyCoachProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      first_name: z.string().trim().min(1).max(60),
      last_name: z.string().trim().min(1).max(60),
      phone: z.string().trim().max(40).default(""),
      bio: z.string().trim().max(2000).default(""),
      specialty: z.enum(["fitness", "peptide", "hybrid"]),
      timezone: z.string().trim().min(3).max(60),
      profile_photo: z.string().trim().max(500).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: existing } = await supabase.from("coaches").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("coaches").update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        bio: data.bio,
        specialty: data.specialty,
        timezone: data.timezone,
        profile_photo: data.profile_photo ?? null,
      } as never).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true, created: false };
    }
    const email = (claims as { email?: string }).email ?? "";
    const { data: created, error } = await supabase.from("coaches").insert({
      user_id: userId,
      email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      bio: data.bio,
      specialty: data.specialty,
      timezone: data.timezone,
      profile_photo: data.profile_photo ?? null,
      status: "pending",
    } as never).select("id").maybeSingle();
    if (error) throw new Error(error.message);

    // Seed a default Mon–Fri availability shell (all off) so the editor has rows.
    const id = (created as { id: string } | null)?.id;
    if (id) {
      await supabase.from("coach_availability").insert(
        [1, 2, 3, 4, 5].map((d) => ({
          coach_id: id, day_of_week: d, is_available: false, start_time: "08:00", end_time: "20:00",
        })) as never,
      );
    }
    return { ok: true, created: true };
  });

export const saveMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      days: z.array(z.object({
        day_of_week: z.number().int().min(1).max(5),
        is_available: z.boolean(),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
      })).min(1).max(5),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", userId).maybeSingle();
    if (!coach) throw new Error("Create your coach profile first.");
    for (const day of data.days) {
      const s = hhmmToMinutes(day.start_time);
      const e = hhmmToMinutes(day.end_time);
      if (s < 8 * 60 || e > 20 * 60) throw new Error("Availability must be between 8:00 AM and 8:00 PM.");
      if (day.is_available && e <= s) throw new Error("End time must be after start time.");
    }
    const coachId = (coach as { id: string }).id;
    for (const day of data.days) {
      const { error } = await supabase.from("coach_availability").upsert({
        coach_id: coachId,
        day_of_week: day.day_of_week,
        is_available: day.is_available,
        start_time: day.start_time,
        end_time: day.end_time,
      } as never, { onConflict: "coach_id,day_of_week" } as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* coach: calls + notifications                                        */
/* ------------------------------------------------------------------ */

export const listMyCoachAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", userId).maybeSingle();
    if (!coach) return { appointments: [] as Appointment[] };
    const { data, error } = await supabase
      .from("coach_appointments").select("*")
      .eq("coach_id", (coach as { id: string }).id)
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    const db = await admin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[];
    const people = await profilesFor(db, rows.map((r) => r.client_id));
    return {
      appointments: rows.map((r) => ({
        ...r,
        client_name: people[r.client_id]?.full_name ?? null,
        client_email: people[r.client_id]?.email ?? null,
      })) as Appointment[],
    };
  });

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["upcoming", "completed", "cancelled", "no_show"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("coach_appointments").update({ status: data.status } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, type, title, message, read, related_call_id, created_at")
      .lte("send_after", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { notifications: (data ?? []) as unknown as AppNotification[] };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true };
    const { error } = await context.supabase
      .from("notifications").update({ read: true } as never).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* admin: coach management                                             */
/* ------------------------------------------------------------------ */

export const adminListCoaches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: coaches } = await db.from("coaches").select("*").order("created_at", { ascending: false });
    const { data: avail } = await db.from("coach_availability").select("coach_id, day_of_week, is_available, start_time, end_time");
    const { data: appts } = await db.from("coach_appointments").select("coach_id, status, start_time");

    const now = Date.now();
    const byCoach: Record<string, { upcoming: number; completed: number; cancelled: number; no_show: number; total: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of (appts ?? []) as any[]) {
      const b = (byCoach[a.coach_id] ??= { upcoming: 0, completed: 0, cancelled: 0, no_show: 0, total: 0 });
      b.total++;
      if (a.status === "upcoming" && new Date(a.start_time).getTime() >= now) b.upcoming++;
      else if (a.status === "completed") b.completed++;
      else if (a.status === "cancelled") b.cancelled++;
      else if (a.status === "no_show") b.no_show++;
    }
    const availByCoach: Record<string, Availability[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of (avail ?? []) as any[]) (availByCoach[a.coach_id] ??= []).push(a);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coaches: ((coaches ?? []) as any[]).map((c) => ({
        ...c,
        availability: (availByCoach[c.id] ?? []).sort((x, y) => x.day_of_week - y.day_of_week),
        counts: byCoach[c.id] ?? { upcoming: 0, completed: 0, cancelled: 0, no_show: 0, total: 0 },
      })) as (Coach & { availability: Availability[]; counts: Record<string, number> })[],
    };
  });

export const adminUpdateCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "suspended", "inactive"]).optional(),
      first_name: z.string().trim().max(60).optional(),
      last_name: z.string().trim().max(60).optional(),
      phone: z.string().trim().max(40).optional(),
      bio: z.string().trim().max(2000).optional(),
      specialty: z.enum(["fitness", "peptide", "hybrid"]).optional(),
      timezone: z.string().trim().max(60).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { id, ...patch } = data;
    if (!Object.keys(patch).length) return { ok: true };
    const { data: coach } = await db.from("coaches").select("user_id, status").eq("id", id).maybeSingle();
    const { error } = await db.from("coaches").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    if (patch.status && coach && patch.status !== coach.status) {
      await notify(db, [{
        user_id: coach.user_id,
        type: "coach_status",
        title: `Your coach account is now ${patch.status}`,
        message: patch.status === "approved"
          ? "You're approved. Set your weekly availability so calls can be scheduled with you."
          : `An admin changed your coach status to ${patch.status}.`,
      }]);
    }
    return { ok: true };
  });

export const adminSetCoachAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      coachId: z.string().uuid(),
      days: z.array(z.object({
        day_of_week: z.number().int().min(1).max(5),
        is_available: z.boolean(),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
      })).min(1).max(5),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    for (const day of data.days) {
      if (hhmmToMinutes(day.start_time) < 8 * 60 || hhmmToMinutes(day.end_time) > 20 * 60) {
        throw new Error("Availability must be between 8:00 AM and 8:00 PM.");
      }
      await db.from("coach_availability").upsert(
        { coach_id: data.coachId, ...day },
        { onConflict: "coach_id,day_of_week" },
      );
    }
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* admin: scheduling                                                   */
/* ------------------------------------------------------------------ */

export const adminSchedulingData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: clients } = await db.from("profiles").select("id, full_name, email").order("full_name");
    const { data: coaches } = await db
      .from("coaches").select("id, first_name, last_name, specialty, status, timezone, email")
      .eq("status", "approved");
    const { data: avail } = await db.from("coach_availability").select("coach_id, day_of_week, is_available, start_time, end_time");
    const availByCoach: Record<string, Availability[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of (avail ?? []) as any[]) (availByCoach[a.coach_id] ??= []).push(a);
    return {
      clients: (clients ?? []) as { id: string; full_name: string | null; email: string | null }[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coaches: ((coaches ?? []) as any[]).map((c) => ({ ...c, availability: availByCoach[c.id] ?? [] })),
    };
  });

/** Which approved coaches can actually take this exact slot. */
export const adminFindAvailableCoaches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      callType: z.enum(["fitness", "peptide"]),
      startIso: z.string().min(10),
      duration: z.number().int(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: coaches } = await db
      .from("coaches").select("id, first_name, last_name, specialty, timezone").eq("status", "approved");
    const out: { id: string; name: string; specialty: string; reason: string | null }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of (coaches ?? []) as any[]) {
      if (!specialtyMatches(c.specialty, data.callType)) continue;
      let reason: string | null = null;
      try {
        await validateSlot(db, { coachId: c.id, callType: data.callType, startIso: data.startIso, duration: data.duration });
      } catch (e) {
        reason = e instanceof Error ? e.message : "Unavailable";
      }
      out.push({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), specialty: c.specialty, reason });
    }
    return { coaches: out };
  });

export const adminScheduleCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      coachId: z.string().uuid(),
      clientId: z.string().uuid(),
      callType: z.enum(["fitness", "peptide"]),
      startIso: z.string().min(10),
      duration: z.number().int(),
      notes: z.string().trim().max(2000).default(""),
      requestId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();

    const { data: client } = await db.from("profiles").select("id, full_name, email").eq("id", data.clientId).maybeSingle();
    if (!client) throw new Error("Client not found.");

    const { coach, start, end } = await validateSlot(db, {
      coachId: data.coachId, callType: data.callType, startIso: data.startIso, duration: data.duration,
    });

    const { data: created, error } = await db.from("coach_appointments").insert({
      coach_id: data.coachId,
      client_id: data.clientId,
      request_id: data.requestId ?? null,
      call_type: data.callType,
      specialty: coach.specialty,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: data.duration,
      notes: data.notes,
      status: "upcoming",
      created_by: context.userId,
    }).select("id").maybeSingle();
    if (error) throw new Error(error.message);

    if (data.requestId) {
      await db.from("coach_calls").update({
        status: "approved", approved_start: start.toISOString(), coach_id: data.coachId, reviewed_at: new Date().toISOString(),
      }).eq("id", data.requestId);
    }

    const label = `${client.full_name || client.email || "Client"} — ${data.callType} call`;
    await notify(db, [
      {
        user_id: coach.user_id,
        type: "call_scheduled",
        title: "New call scheduled",
        message: `${label} on ${start.toISOString()}.`,
        related_call_id: created?.id ?? null,
      },
      ...(created?.id ? reminderRows(coach.user_id, created.id, start, label) : []),
    ]);

    // Email the coach, and the client (their requested call is now confirmed).
    try {
      const { sendAppEmail } = await import("@/lib/email/send.server");
      const { formatDateTime, CALL_TYPE_LABEL } = await import("@/lib/tz");
      const coachTz: string = coach.timezone || DEFAULT_TZ;
      const typeLabel = CALL_TYPE_LABEL[data.callType] ?? data.callType;
      const coachName = `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim();
      const { data: coachRow } = await db.from("coaches").select("email").eq("id", data.coachId).maybeSingle();
      if (coachRow?.email) {
        await sendAppEmail({
          templateName: "coach-call-scheduled",
          recipientEmail: coachRow.email,
          idempotencyKey: `coach-call-scheduled-${created?.id ?? data.startIso}`,
          templateData: {
            coachName: coach.first_name ?? "",
            clientName: client.full_name ?? "",
            clientEmail: client.email ?? "",
            when: `${formatDateTime(start, coachTz)} (${coachTz})`,
            callType: typeLabel,
            duration: data.duration,
            notes: data.notes,
          },
        });
      }
      if (client.email) {
        await sendAppEmail({
          templateName: "call-approved",
          recipientEmail: client.email,
          idempotencyKey: `call-approved-${created?.id ?? data.startIso}`,
          templateData: {
            name: client.full_name ?? "",
            when: `${formatDateTime(start, coachTz)} (${coachTz})`,
            callType: typeLabel,
            duration: data.duration,
            coachName,
          },
        });
      }
    } catch (e) {
      console.warn("[coaching] call emails failed", e);
    }
    return { ok: true, id: created?.id };
  });


export const adminUpdateCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      coachId: z.string().uuid().optional(),
      startIso: z.string().optional(),
      duration: z.number().int().optional(),
      notes: z.string().trim().max(2000).optional(),
      status: z.enum(["upcoming", "completed", "cancelled", "no_show"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: existing } = await db.from("coach_appointments").select("*").eq("id", data.id).maybeSingle();
    if (!existing) throw new Error("Call not found.");

    const patch: Record<string, unknown> = {};
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.status !== undefined) patch.status = data.status;

    const reschedule = data.startIso !== undefined || data.duration !== undefined || (data.coachId && data.coachId !== existing.coach_id);
    let start = new Date(existing.start_time);
    let coach = null as null | { user_id: string; specialty: string };
    if (reschedule) {
      const coachId = data.coachId ?? existing.coach_id;
      const duration = data.duration ?? existing.duration_minutes;
      const startIso = data.startIso ?? existing.start_time;
      const v = await validateSlot(db, { coachId, callType: existing.call_type, startIso, duration, ignoreId: data.id });
      start = v.start;
      coach = v.coach;
      patch.coach_id = coachId;
      patch.specialty = v.coach.specialty;
      patch.start_time = v.start.toISOString();
      patch.end_time = v.end.toISOString();
      patch.duration_minutes = duration;
    }

    const { error } = await db.from("coach_appointments").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Notify the affected coach(es).
    const { data: coachRow } = await db.from("coaches").select("user_id").eq("id", patch.coach_id ?? existing.coach_id).maybeSingle();
    const targets: string[] = [];
    if (coachRow?.user_id) targets.push(coachRow.user_id);
    if (patch.coach_id && patch.coach_id !== existing.coach_id) {
      const { data: prev } = await db.from("coaches").select("user_id").eq("id", existing.coach_id).maybeSingle();
      if (prev?.user_id) targets.push(prev.user_id);
    }
    if (data.status === "cancelled") {
      await notify(db, targets.map((u) => ({
        user_id: u, type: "call_cancelled", title: "Call cancelled",
        message: "A scheduled call was cancelled by an admin.", related_call_id: data.id,
      })));
      await db.from("notifications").delete().eq("related_call_id", data.id).in("type", ["reminder_24h", "reminder_1h"]);
    } else if (reschedule) {
      await notify(db, targets.map((u) => ({
        user_id: u, type: "call_rescheduled", title: "Call rescheduled",
        message: `A call was moved to ${start.toISOString()}.`, related_call_id: data.id,
      })));
      await db.from("notifications").delete().eq("related_call_id", data.id).in("type", ["reminder_24h", "reminder_1h"]);
      if (coach) await notify(db, reminderRows(coach.user_id, data.id, start, "Coaching call"));
    }
    return { ok: true };
  });

export const adminDeleteCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("coach_appointments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data, error } = await db.from("coach_appointments").select("*").order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[];
    const people = await profilesFor(db, rows.map((r) => r.client_id));
    const { data: coaches } = await db.from("coaches").select("id, first_name, last_name, specialty");
    const coachMap = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((coaches ?? []) as any[]).map((c) => [c.id, { name: `${c.first_name} ${c.last_name}`.trim(), specialty: c.specialty }]),
    );
    return {
      appointments: rows.map((r) => ({
        ...r,
        client_name: people[r.client_id]?.full_name ?? null,
        client_email: people[r.client_id]?.email ?? null,
        coach_name: coachMap[r.coach_id]?.name ?? null,
        coach_specialty: coachMap[r.coach_id]?.specialty ?? null,
      })) as Appointment[],
    };
  });

/** Client-facing: my scheduled calls with a coach. */
export const listMyClientAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("coach_appointments").select("*")
      .eq("client_id", context.userId)
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    const db = await admin();
    const { data: coaches } = await db.from("coaches").select("id, first_name, last_name, specialty");
    const coachMap = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((coaches ?? []) as any[]).map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim()]),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { appointments: ((data ?? []) as any[]).map((r) => ({ ...r, coach_name: coachMap[r.coach_id] ?? null })) as Appointment[] };
  });
