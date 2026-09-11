import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the welcome email once per account. Called right after a new account is
 * created. Auth-only so it can't be used to spray mail at arbitrary addresses:
 * the recipient is always the signed-in user's own email.
 */
export async function sendWelcomeEmailTo(email: string, name?: string | null) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) return { sent: false };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Once per address, ever.
  const { data: already } = await supabaseAdmin
    .from("email_send_log")
    .select("id")
    .eq("template_name", "welcome")
    .ilike("recipient_email", recipient)
    .maybeSingle();
  if (already) return { sent: false };

  const { sendAppEmail } = await import("@/lib/email/send.server");
  const res = await sendAppEmail({
    templateName: "welcome",
    recipientEmail: recipient,
    idempotencyKey: `welcome:${recipient}`,
    templateData: { name: name ?? undefined },
  });
  return { sent: res.queued };
}

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().max(120).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!email) return { sent: false };
    const fallbackName =
      (context.claims?.["user_metadata"] as { full_name?: string } | undefined)?.full_name ?? null;
    return sendWelcomeEmailTo(email, data.name ?? fallbackName);
  });
