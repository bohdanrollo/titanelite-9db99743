// Server-side helper to enqueue a transactional email directly using the
// service-role client. Bypasses the HTTP send route (which requires a user
// JWT) so triggers from admin server functions don't fail with 401 when the
// caller's Authorization header isn't forwardable.

import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "titanelite";
const SENDER_DOMAIN = "notify.titanelite.org";
const FROM_DOMAIN = "notify.titanelite.org";

type SendArgs = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  // Kept for backward compatibility — unused now that we enqueue directly.
  authHeader?: string | null;
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendAppEmail(args: SendArgs): Promise<{ queued: boolean }> {
  try {
    const template = TEMPLATES[args.templateName];
    if (!template) {
      console.warn("[email] unknown template", args.templateName);
      return { queued: false };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const recipient = template.to || args.recipientEmail;
    if (!recipient) {
      console.warn("[email] no recipient for", args.templateName);
      return { queued: false };
    }
    const normalized = recipient.toLowerCase();
    const messageId = crypto.randomUUID();

    // Suppression check
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    if (suppressed) {
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: args.templateName,
        recipient_email: recipient,
        status: "suppressed",
      });
      return { queued: false };
    }

    // Unsubscribe token (get or create)
    let unsubscribeToken: string;
    const { data: existingToken } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", normalized)
      .maybeSingle();

    if (existingToken && !existingToken.used_at) {
      unsubscribeToken = existingToken.token;
    } else {
      unsubscribeToken = generateToken();
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert(
          { token: unsubscribeToken, email: normalized },
          { onConflict: "email", ignoreDuplicates: true },
        );
      const { data: stored } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", normalized)
        .maybeSingle();
      if (stored?.token) unsubscribeToken = stored.token;
    }

    // Render
    const element = React.createElement(template.component, args.templateData ?? {});
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function"
        ? template.subject(args.templateData ?? {})
        : template.subject;

    // Log pending, then enqueue
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.templateName,
      recipient_email: recipient,
      status: "pending",
    });

    const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: args.templateName,
        idempotency_key: args.idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("[email] enqueue failed", enqueueError);
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: args.templateName,
        recipient_email: recipient,
        status: "failed",
        error_message: enqueueError.message,
      });
      return { queued: false };
    }

    return { queued: true };
  } catch (err) {
    console.warn("[email] send failed", err);
    return { queued: false };
  }
}
