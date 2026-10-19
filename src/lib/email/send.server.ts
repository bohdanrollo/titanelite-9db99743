// Server-side helper used by app features to send a registered template
// through Lovable's managed email delivery. Keeps the original signature.

import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { TEMPLATES } from "@/lib/email-templates/registry";

type SendArgs = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  // Kept for backward compatibility — unused.
  authHeader?: string | null;
};

export async function sendAppEmail(args: SendArgs): Promise<{ queued: boolean }> {
  const template = TEMPLATES[args.templateName];
  if (!template) {
    console.warn("[email] unknown template", args.templateName);
    return { queued: false };
  }
  const recipient = template.to || args.recipientEmail;
  if (!recipient) {
    console.warn("[email] no recipient for", args.templateName);
    return { queued: false };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const log = async (status: "sent" | "suppressed" | "failed", error_message?: string) => {
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: null,
      template_name: args.templateName,
      recipient_email: recipient,
      status,
      ...(error_message ? { error_message } : {}),
    });
    if (error) console.error("[email] send log write failed", { code: error.code, message: error.message });
  };

  try {
    const res = await sendTemplateEmail(args.templateName, recipient, {
      templateData: args.templateData ?? {},
      idempotencyKey: args.idempotencyKey,
    });
    if (res.sent) {
      await log("sent");
      return { queued: true };
    }
    await log("suppressed");
    return { queued: false };
  } catch (err) {
    console.warn("[email] send failed", err);
    await log("failed", err instanceof Error ? err.message : String(err));
    return { queued: false };
  }
}
