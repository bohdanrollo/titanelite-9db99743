import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Welcome email for brand-new accounts.
 *
 * The content is NOT authored here. We read the Broadcast the owner designed in
 * Resend (RESEND_WELCOME_BROADCAST_ID) and deliver that exact HTML/subject/from
 * to the single new signup through Resend's transactional /emails endpoint.
 *
 * Why not POST /broadcasts/:id/send? That endpoint sends to an entire audience
 * or segment — Resend has no supported way to send an existing Broadcast to one
 * contact. Sending the Broadcast would mail the whole Titan Elite list, so we
 * never call it.
 *
 * Idempotency: `marketing_subscribers.welcome_email_status` is the source of
 * truth (pending / processing / sent / failed / skipped), backed by a second
 * guard in `email_send_log`.
 */

type WelcomeOutcome = "sent" | "already_sent" | "skipped" | "failed" | "processing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

function splitName(name: string) {
  const clean = (name ?? "").trim().replace(/\s+/g, " ");
  const space = clean.indexOf(" ");
  if (space === -1) return { first: clean || null, last: null };
  return { first: clean.slice(0, space), last: clean.slice(space + 1) };
}

async function unsubscribeUrl(supabaseAdmin: Admin, email: string) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", email)
      .maybeSingle();
    let token = existing?.token as string | undefined;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      await supabaseAdmin.from("email_unsubscribe_tokens").insert({ token, email });
    }
    return `https://titanelite.org/email/unsubscribe?token=${token}`;
  } catch {
    return "https://titanelite.org/email/unsubscribe";
  }
}

/** Fill Resend merge placeholders that only exist inside broadcast sends. */
function personalize(html: string, vars: { firstName: string; email: string; unsub: string }) {
  return html
    .replace(/\{\{\{?\s*RESEND_UNSUBSCRIBE_URL\s*\}?\}\}/g, vars.unsub)
    .replace(/\{\{\{?\s*FIRST_NAME\s*(?:\|[^}]*)?\}?\}\}/g, vars.firstName)
    .replace(/\{\{\{?\s*LAST_NAME\s*(?:\|[^}]*)?\}?\}\}/g, "")
    .replace(/\{\{\{?\s*EMAIL\s*(?:\|[^}]*)?\}?\}\}/g, vars.email);
}

/**
 * Trigger the welcome workflow for one address. Never throws — signup must
 * succeed even when Resend is down; the row is left retryable.
 */
export async function sendWelcomeEmailTo(
  email: string,
  name?: string | null,
  userId?: string | null,
): Promise<{ outcome: WelcomeOutcome; reason?: string }> {
  const recipient = (email ?? "").trim().toLowerCase();
  if (!recipient) return { outcome: "skipped", reason: "no email" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { first, last } = splitName(name ?? "");
  let rowId: string | undefined;

  try {
    // ---- 1. Subscriber record (reuse the existing marketing consent system).
    const { data: existing } = await supabaseAdmin
      .from("marketing_subscribers")
      .select("id, subscribed, resend_contact_id, welcome_email_status, first_name, last_name")
      .ilike("email", recipient)
      .maybeSingle();

    if (existing) {
      rowId = existing.id as string;
      const status = existing.welcome_email_status as string;
      if (status === "sent" || status === "processing") {
        console.info("[welcome] duplicate prevented", { status });
        return { outcome: status === "sent" ? "already_sent" : "processing" };
      }
      if (!existing.subscribed) {
        // Opted out — never send promotional content, never resubscribe.
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({ welcome_email_status: "skipped", welcome_email_error: "opted out" })
          .eq("id", rowId);
        return { outcome: "skipped", reason: "opted out" };
      }
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          first_name: existing.first_name ?? first,
          last_name: existing.last_name ?? last,
          ...(userId ? { user_id: userId } : {}),
        })
        .eq("id", rowId);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("marketing_subscribers")
        .insert({
          email: recipient,
          first_name: first,
          last_name: last,
          subscribed: true,
          source: "signup",
          resend_sync_status: "pending",
          welcome_email_status: "pending",
          ...(userId ? { user_id: userId } : {}),
        })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      rowId = inserted?.id as string | undefined;
    }

    // Second guard: an existing log row means this address was already mailed.
    const { data: alreadyLogged } = await supabaseAdmin
      .from("email_send_log")
      .select("id")
      .eq("template_name", "welcome")
      .ilike("recipient_email", recipient)
      .maybeSingle();
    if (alreadyLogged) {
      if (rowId) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({ welcome_email_status: "sent" })
          .eq("id", rowId);
      }
      return { outcome: "already_sent" };
    }

    // Bounced / complained / unsubscribed addresses are never mailed.
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", recipient)
      .maybeSingle();
    if (suppressed) {
      if (rowId) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({ welcome_email_status: "skipped", welcome_email_error: "suppressed" })
          .eq("id", rowId);
      }
      return { outcome: "skipped", reason: "suppressed" };
    }

    if (rowId) {
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({ welcome_email_status: "processing", welcome_email_error: null })
        .eq("id", rowId);
    }

    // ---- 2. Resend contact sync (dedup by email, never resubscribes).
    const { upsertContact, getBroadcast, sendEmail, welcomeBroadcastId } = await import(
      "@/lib/resend.server"
    );
    const broadcastId = welcomeBroadcastId();

    let contactId: string | null = (existing?.resend_contact_id as string | null) ?? null;
    try {
      const res = await upsertContact({
        email: recipient,
        firstName: first,
        lastName: last,
        subscribed: true,
        knownContactId: contactId,
      });
      contactId = res.contactId;
      console.info("[welcome] resend contact", res.action);
      if (rowId) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({
            resend_contact_id: contactId,
            migrated_to_resend: true,
            resend_sync_status: "synced",
            resend_sync_error: null,
            resend_last_synced_at: new Date().toISOString(),
          })
          .eq("id", rowId);
      }
    } catch (syncErr) {
      // Contact sync failure must not block the welcome email.
      console.error("[welcome] contact sync failed", syncErr);
      if (rowId) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({
            resend_sync_status: "failed",
            resend_sync_error: syncErr instanceof Error ? syncErr.message : String(syncErr),
          })
          .eq("id", rowId);
      }
    }

    // ---- 3. Deliver the Broadcast content to this one recipient.
    const broadcast = await getBroadcast(broadcastId);
    const unsub = await unsubscribeUrl(supabaseAdmin, recipient);
    const html = personalize(broadcast.html, {
      firstName: first ?? "there",
      email: recipient,
      unsub,
    });
    const replyTo = Array.isArray(broadcast.reply_to)
      ? broadcast.reply_to[0]
      : (broadcast.reply_to ?? undefined);

    const { id: messageId } = await sendEmail({
      to: recipient,
      subject: broadcast.subject,
      html,
      from: broadcast.from,
      replyTo: replyTo ?? undefined,
      headers: { "List-Unsubscribe": `<${unsub}>` },
    });

    console.info("[welcome] sent", { broadcastId, messageId });

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "welcome",
      recipient_email: recipient,
      status: "sent",
      metadata: { broadcast_id: broadcastId, resend_contact_id: contactId },
    });

    if (rowId) {
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          welcome_email_status: "sent",
          welcome_email_sent_at: new Date().toISOString(),
          welcome_broadcast_id: broadcastId,
          welcome_message_id: messageId,
          welcome_email_error: null,
        })
        .eq("id", rowId);
    }

    return { outcome: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[welcome] failed", message);
    if (rowId) {
      // Back to a retryable state.
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({ welcome_email_status: "failed", welcome_email_error: message.slice(0, 500) })
        .eq("id", rowId);
    }
    return { outcome: "failed", reason: message };
  }
}

/**
 * Called by the signup page right after a NEW account is created.
 *
 * This no longer renders or sends any email content from here — it triggers the
 * existing Resend Automation `titanelite.signup` for the authenticated user's
 * own email only. Resend owns the email design and content.
 */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().max(120).optional(),
        age21: z.literal(true, { message: "You must confirm that you are 21 or older." }),
        researchUse: z.literal(true, {
          message:
            "You must confirm you understand peptide information and sources are not for human or animal use.",
        }),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!email) return { outcome: "skipped" as const };
    const fallbackName =
      (context.claims?.["user_metadata"] as { full_name?: string } | undefined)?.full_name ?? null;
    const { triggerTitanEliteWelcome } = await import("@/lib/titanelite-welcome.server");
    console.info("[titanelite welcome] signup trigger requested", { userId: context.userId });
    return triggerTitanEliteWelcome({
      email,
      name: data.name ?? fallbackName,
      userId: context.userId,
      isNewSignup: true,
      acknowledgements: { age21: data.age21, researchUse: data.researchUse },
    });
  });
