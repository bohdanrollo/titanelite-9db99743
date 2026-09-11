import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Welcome email for brand-new accounts, sent through Resend (titanelite.org is
 * a verified Resend sending domain). Sent at most once per address — we record
 * every send in `email_send_log` and check it first.
 */
export async function sendWelcomeEmailTo(email: string, name?: string | null) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) return { sent: false };

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: already } = await supabaseAdmin
      .from("email_send_log")
      .select("id")
      .eq("template_name", "welcome")
      .ilike("recipient_email", recipient)
      .maybeSingle();
    if (already) return { sent: false };

    // Never mail someone who bounced, complained or unsubscribed.
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", recipient)
      .maybeSingle();
    if (suppressed) return { sent: false };

    const [{ default: React }, { render }, { TEMPLATES }, { sendEmail }] = await Promise.all([
      import("react"),
      import("@react-email/render"),
      import("@/lib/email-templates/registry"),
      import("@/lib/resend.server"),
    ]);

    const template = TEMPLATES["welcome"];
    if (!template) return { sent: false };

    const data = { name: name ?? undefined };
    const element = React.createElement(template.component, data);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function" ? template.subject(data) : template.subject;

    const { id } = await sendEmail({ to: recipient, subject, html, text });

    await supabaseAdmin.from("email_send_log").insert({
      message_id: id,
      template_name: "welcome",
      recipient_email: recipient,
      status: "sent",
    });

    return { sent: true };
  } catch (err) {
    console.error("[welcome] send failed", err);
    return { sent: false };
  }
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
