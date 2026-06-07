import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DraftSchema = z.object({
  client_name: z.string().optional(),
  overview: z.string().optional(),
  training_block: z.object({
    weeks: z.number().optional(),
    split: z.string().optional(),
    key_lifts: z.array(z.string()).optional(),
    progression: z.string().optional(),
    weekly_schedule: z.array(z.object({
      day: z.string(),
      focus: z.string(),
      sessions: z.array(z.string()),
    })).optional(),
  }).optional(),
  peptide_protocol: z.object({
    overview: z.string().optional(),
    items: z.array(z.object({
      name: z.string(),
      dose: z.string().optional(),
      timing: z.string().optional(),
      notes: z.string().optional(),
    })).optional(),
    educational_disclaimer: z.string().optional(),
  }).optional(),
  nutrition_notes: z.string().optional(),
  recovery_notes: z.string().optional(),
});

type ProtocolDraft = z.infer<typeof DraftSchema>;

async function assertAdmin(supabase: { from: (t: string) => unknown }, userId: string) {
  const q = (supabase.from("user_roles") as { select: (c: string) => { eq: (a: string, b: string) => { eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> } } } })
    .select("role").eq("user_id", userId).eq("role", "admin");
  const { data } = await q.maybeSingle();
  if (!data) throw new Error("Admin role required");
}

export const generateProtocolDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ intakeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: intake, error } = await supabase.from("intakes").select("*").eq("id", data.intakeId).single();
    if (error || !intake) throw new Error("Intake not found");

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", intake.user_id).maybeSingle();

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateObject } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const tierWeeks: Record<string, number> = { Foundation: 4, Elite: 12, Apex: 12 };
    const tier = intake.selected_plan || "Elite";
    const weeks = tierWeeks[tier] ?? 12;

    const prompt = `You are a senior strength coach drafting a custom protocol for a Titan Elite client.
Tier: ${tier} (target block: ~${weeks} weeks)
Client profile:
- Age: ${intake.age ?? "?"} · Gender: ${intake.gender ?? "?"} · Height: ${intake.height ?? "?"} · Weight: ${intake.weight ?? "?"}
- Fitness experience: ${intake.fitness_experience ?? "—"}
- Current program: ${intake.current_program ?? "—"}
- Supplements: ${intake.current_supplements ?? "—"}
- Medications: ${intake.current_medications ?? "—"}
- Injuries: ${intake.injury_history ?? "—"}
- Health conditions: ${intake.health_conditions ?? "—"}
- Weightlifting goals: ${intake.weightlifting_goals ?? "—"}
- Strength goals: ${intake.strength_goals ?? "—"}
- Muscle gain goals: ${intake.muscle_gain_goals ?? "—"}
- Fat loss goals: ${intake.fat_loss_goals ?? "—"}
- Peptide experience: ${intake.peptide_experience ?? "—"}
- Peptides of interest: ${intake.peptides_of_interest ?? "—"}
- Lifestyle: ${intake.lifestyle ?? "—"} · Sleep: ${intake.sleep_habits ?? "—"} · Nutrition: ${intake.nutrition_habits ?? "—"}

Draft a specific, periodized training block with weekly schedule (give 4-5 training days).
For peptides, give EDUCATIONAL information only — never prescribe. Include an educational disclaimer.
Be concrete with sets/reps/% in key lifts. Account for injuries.`;

    const { object } = await generateObject({
      model: gateway("google/gemini-3-flash-preview"),
      schema: DraftSchema,
      prompt,
    });

    const draft: ProtocolDraft = {
      ...object,
      client_name: object.client_name || profile?.full_name || profile?.email || "Client",
    };

    const { data: existing } = await supabase
      .from("protocols")
      .select("id")
      .eq("source_intake_id", data.intakeId)
      .eq("status", "draft")
      .maybeSingle();

    if (existing) {
      const { error: uErr } = await supabase
        .from("protocols")
        .update({ draft_content: draft as never, title: `${tier} Protocol — ${draft.client_name}` })
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
      return { protocolId: existing.id, draft };
    }

    const { data: created, error: iErr } = await supabase
      .from("protocols")
      .insert({
        user_id: intake.user_id,
        type: "weightlifting",
        title: `${tier} Protocol — ${draft.client_name}`,
        draft_content: draft as never,
        status: "draft",
        source_intake_id: data.intakeId,
      })
      .select("id")
      .single();
    if (iErr) throw new Error(iErr.message);
    return { protocolId: created.id, draft };
  });

export const saveProtocolDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    protocolId: z.string().uuid(),
    draft: DraftSchema,
    title: z.string().min(1).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const update: { draft_content: ProtocolDraft; title?: string } = { draft_content: data.draft };
    if (data.title) update.title = data.title;
    const { error } = await supabase.from("protocols").update(update as never).eq("id", data.protocolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ protocolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: protocol, error } = await supabase
      .from("protocols")
      .select("id, user_id, title, draft_content")
      .eq("id", data.protocolId)
      .single();
    if (error || !protocol) throw new Error("Protocol not found");
    if (!protocol.draft_content) throw new Error("No draft content to render");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderProtocolPdf } = await import("./pdf.server");

    const pdfBytes = await renderProtocolPdf(protocol.draft_content as ProtocolDraft, { title: protocol.title });
    const path = `${protocol.user_id}/protocols/${protocol.id}.pdf`;

    const { error: uErr } = await supabaseAdmin.storage
      .from("client-uploads")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uErr) throw new Error(`Upload failed: ${uErr.message}`);

    const deliveredAt = new Date().toISOString();
    const { error: pErr } = await supabaseAdmin
      .from("protocols")
      .update({ status: "delivered", pdf_storage_path: path, delivered_at: deliveredAt })
      .eq("id", protocol.id);
    if (pErr) throw new Error(pErr.message);

    try {
      const { data: profile } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", protocol.user_id).maybeSingle();
      if (profile?.email) {
        const { sendAppEmail } = await import("./email/send.server");
        await sendAppEmail({
          templateName: "protocol-ready",
          recipientEmail: profile.email,
          idempotencyKey: `protocol-${protocol.id}-delivered`,
          templateData: { name: profile.full_name ?? "", title: protocol.title },
        });
      }
    } catch (err) {
      console.error("[sendProtocol] email failed", err);
    }

    return { ok: true, deliveredAt };
  });

export const getProtocolDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ protocolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: p, error } = await supabase
      .from("protocols")
      .select("id, user_id, pdf_storage_path")
      .eq("id", data.protocolId)
      .single();
    if (error || !p) throw new Error("Not found");
    if (p.user_id !== userId) {
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!role) throw new Error("Forbidden");
    }
    if (!p.pdf_storage_path) throw new Error("No PDF available");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("client-uploads")
      .createSignedUrl(p.pdf_storage_path, 60 * 60);
    if (sErr || !signed) throw new Error("Could not sign URL");
    if (p.user_id === userId) {
      await supabase.from("protocols").update({ viewed_at: new Date().toISOString() }).eq("id", p.id);
    }
    return { url: signed.signedUrl };
  });
