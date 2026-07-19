import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const broadcastProtocolReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Admin required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: protocols, error } = await supabaseAdmin
      .from("protocols")
      .select("id, title, user_id, delivered_at")
      .eq("status", "delivered")
      .not("pdf_storage_path", "is", null);
    if (error) throw new Error(error.message);

    const { sendAppEmail } = await import("./email/send.server");
    const authHeader = getRequest()?.headers.get("authorization") ?? null;

    const results: Array<{ email: string; queued: boolean }> = [];
    for (const p of protocols ?? []) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", p.user_id)
        .maybeSingle();
      if (!profile?.email) continue;
      const r = await sendAppEmail({
        templateName: "protocol-ready",
        recipientEmail: profile.email,
        idempotencyKey: `protocol-${p.id}-rebroadcast-${new Date().toISOString().slice(0, 10)}`,
        templateData: { name: profile.full_name ?? "", title: p.title },
        authHeader,
      });
      results.push({ email: profile.email, queued: r.queued });
    }
    return { count: results.length, results };
  });
