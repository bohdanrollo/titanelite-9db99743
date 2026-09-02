// Server-side helper to send a transactional email through Lovable's managed
// email API. Delivery, retries, suppression, and unsubscribe handling are
// enforced by Lovable — this wrapper only keeps the app's own send log rows.

import { sendTemplateEmail } from "@/lib/email-templates/send-email";

type SendArgs = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  // Kept for backward compatibility with existing call sites.
  authHeader?: string | null;
};

async function logSend(
  templateName: string,
  recipientEmail: string,
  status: "sent" | "suppressed" | "failed",
  errorMessage?: string,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipientEmail,
      status,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    });
    if (error) console.error("[email] send log write failed", error);
  } catch (err) {
    console.error("[email] send log write failed", err);
  }
}

export async function sendAppEmail(args: SendArgs): Promise<{ queued: boolean }> {
  const recipient = args.recipientEmail;
  try {
    const result = await sendTemplateEmail(args.templateName, recipient, {
      templateData: args.templateData,
      idempotencyKey: args.idempotencyKey,
    });

    if (!result.sent) {
      await logSend(args.templateName, recipient, "suppressed");
      return { queued: false };
    }

    await logSend(args.templateName, recipient, "sent");
    return { queued: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[email] send failed", message);
    await logSend(args.templateName, recipient, "failed", message);
    return { queued: false };
  }
}
