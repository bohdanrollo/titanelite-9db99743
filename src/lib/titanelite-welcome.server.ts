import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAutomationEvent } from "@/lib/resend.server";
import { splitName } from "@/lib/marketing.server";

/** Trusted, server-side only. The browser can never choose the event or recipient. */
const TITANELITE_SIGNUP_EVENT = "titanelite.signup";

export type TitanEliteWelcomeOutcome =
  | "triggered"
  | "already_triggered"
  | "processing"
  | "failed"
  | "skipped";

type TriggerInput = {
  /** Server-resolved email of the newly created account. */
  email: string;
  name?: string | null;
  userId?: string | null;
  /** True only when the account was genuinely just created. */
  isNewSignup?: boolean;
};

/**
 * Trigger the existing Resend Automation `titanelite.signup` for exactly one
 * newly registered Titan Elite user. Resend's /events/send accepts a single
 * recipient, so this can never mail the audience.
 *
 * Idempotency lives in marketing_subscribers.titanelite_welcome_status.
 * Resend documents no idempotency key for /events/send, so an ambiguous
 * network failure is left as `processing` instead of auto-retrying.
 */
export async function triggerTitanEliteWelcome(
  input: TriggerInput,
): Promise<{ outcome: TitanEliteWelcomeOutcome; reason?: string }> {
  const email = (input.email ?? "").trim().toLowerCase();
  if (!email) return { outcome: "skipped", reason: "no email" };

  const { first, last } = splitName(input.name ?? "");

  try {
    const { data: existing } = await supabaseAdmin
      .from("marketing_subscribers")
      .select("id, subscribed, first_name, last_name, titanelite_welcome_status")
      .ilike("email", email)
      .maybeSingle();

    let rowId = existing?.id as string | undefined;

    const ack =
      input.acknowledgements?.age21 && input.acknowledgements?.researchUse
        ? {
            age_21_confirmed: true,
            research_use_confirmed: true,
            acknowledgements_confirmed_at: new Date().toISOString(),
          }
        : {};

    if (!rowId) {
      const { data: inserted, error } = await supabaseAdmin
        .from("marketing_subscribers")
        .insert({
          email,
          first_name: first,
          last_name: last,
          subscribed: true,
          source: "signup",
          resend_sync_status: "pending",
          titanelite_welcome_status: "pending",
          ...(input.userId ? { user_id: input.userId } : {}),
          ...ack,
        })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      rowId = inserted?.id as string | undefined;
    } else if (input.isNewSignup) {
      // A brand-new account for an address that already had a row (e.g. a
      // newsletter subscriber). Arm the workflow once, never for `triggered`.
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          titanelite_welcome_status: "pending",
          titanelite_welcome_error: null,
          first_name: existing?.first_name ?? first,
          last_name: existing?.last_name ?? last,
          ...(input.userId ? { user_id: input.userId } : {}),
          ...ack,
        })
        .eq("id", rowId)
        .in("titanelite_welcome_status", ["pending", "failed", "skipped"]);
    } else if (Object.keys(ack).length) {
      await supabaseAdmin.from("marketing_subscribers").update(ack).eq("id", rowId);
    }

    if (!rowId) return { outcome: "failed", reason: "no subscriber record" };

    // Bounced / complained / unsubscribed addresses are never mailed.
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (suppressed) {
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({ titanelite_welcome_status: "skipped", titanelite_welcome_error: "suppressed" })
        .eq("id", rowId)
        .in("titanelite_welcome_status", ["pending", "failed"]);
      return { outcome: "skipped", reason: "suppressed" };
    }

    // Atomically claim the row so concurrent submits cannot both send.
    const attemptedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("marketing_subscribers")
      .update({
        titanelite_welcome_status: "processing",
        titanelite_welcome_event_name: TITANELITE_SIGNUP_EVENT,
        titanelite_welcome_error: null,
        titanelite_welcome_last_attempt_at: attemptedAt,
      })
      .eq("id", rowId)
      .eq("subscribed", true)
      .in("titanelite_welcome_status", ["pending", "failed"])
      .select("id, email, first_name, last_name, user_id, created_at, titanelite_welcome_attempts")
      .maybeSingle();

    if (claimError) {
      console.error("[titanelite welcome] claim failed", { subscriberId: rowId });
      return { outcome: "failed", reason: claimError.message };
    }

    if (!claimed) {
      const { data: current } = await supabaseAdmin
        .from("marketing_subscribers")
        .select("subscribed, titanelite_welcome_status")
        .eq("id", rowId)
        .maybeSingle();
      const status = current?.titanelite_welcome_status;
      if (status === "triggered") {
        console.info("[titanelite welcome] duplicate prevented", { subscriberId: rowId });
        return { outcome: "already_triggered" };
      }
      if (status === "processing") return { outcome: "processing" };
      return { outcome: "skipped", reason: current?.subscribed ? "not eligible" : "opted out" };
    }

    const attempts = (claimed.titanelite_welcome_attempts ?? 0) + 1;
    await supabaseAdmin
      .from("marketing_subscribers")
      .update({ titanelite_welcome_attempts: attempts })
      .eq("id", claimed.id)
      .eq("titanelite_welcome_status", "processing");

    console.info("[titanelite welcome] event attempt", {
      event: TITANELITE_SIGNUP_EVENT,
      subscriberId: claimed.id,
      attempt: attempts,
    });

    try {
      const accepted = await sendAutomationEvent({
        event: TITANELITE_SIGNUP_EVENT,
        email: claimed.email,
        payload: {
          first_name: claimed.first_name ?? "",
          last_name: claimed.last_name ?? "",
          titanelite_user_id: claimed.user_id ?? input.userId ?? "",
          signup_timestamp: claimed.created_at,
          source: "titan_elite",
        },
      });

      const triggeredAt = new Date().toISOString();
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          titanelite_welcome_status: "triggered",
          titanelite_welcome_triggered_at: triggeredAt,
          titanelite_welcome_event_name: accepted.event,
          titanelite_welcome_error: null,
        })
        .eq("id", claimed.id)
        .eq("titanelite_welcome_status", "processing");

      await supabaseAdmin.from("email_send_log").insert({
        message_id: null,
        template_name: TITANELITE_SIGNUP_EVENT,
        recipient_email: claimed.email,
        status: "sent",
        metadata: {
          event: accepted.event,
          subscriber_id: claimed.id,
          user_id: claimed.user_id,
          accepted_at: triggeredAt,
        },
      });

      console.info("[titanelite welcome] event accepted", {
        event: accepted.event,
        subscriberId: claimed.id,
      });
      return { outcome: "triggered" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const definiteRejection = /^Resend event (failed|returned an unexpected response)/.test(
        message,
      );
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          titanelite_welcome_status: definiteRejection ? "failed" : "processing",
          titanelite_welcome_error: message.slice(0, 500),
        })
        .eq("id", claimed.id)
        .eq("titanelite_welcome_status", "processing");
      console.error("[titanelite welcome] event failed", {
        event: TITANELITE_SIGNUP_EVENT,
        subscriberId: claimed.id,
        retryable: definiteRejection,
        message,
      });
      return { outcome: definiteRejection ? "failed" : "processing", reason: message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[titanelite welcome] unexpected failure", message);
    return { outcome: "failed", reason: message };
  }
}
