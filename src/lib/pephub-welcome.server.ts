import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAutomationEvent } from "@/lib/resend.server";

const PEPHUB_SIGNUP_EVENT = "pephub.signup";

export type PepHubWelcomeOutcome =
  | "triggered"
  | "already_triggered"
  | "processing"
  | "failed"
  | "skipped";

type TriggerInput = {
  subscriberId: string;
  userId: string;
  isNewSignup?: boolean;
};

/**
 * Trigger the existing PepHub Automation for one server-resolved subscriber.
 * Resend does not support idempotency keys for /events/send, so an ambiguous
 * network failure remains `processing` to prevent an unsafe automatic retry.
 */
export async function triggerPepHubWelcome(
  input: TriggerInput,
): Promise<{ outcome: PepHubWelcomeOutcome; reason?: string }> {
  if (input.isNewSignup) {
    await supabaseAdmin
      .from("marketing_subscribers")
      .update({ pephub_welcome_status: "pending", pephub_welcome_error: null })
      .eq("id", input.subscriberId)
      .eq("user_id", input.userId)
      .in("pephub_welcome_status", ["pending", "failed", "skipped"]);
  }

  const attemptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("marketing_subscribers")
    .update({
      pephub_welcome_status: "processing",
      pephub_welcome_event_name: PEPHUB_SIGNUP_EVENT,
      pephub_welcome_error: null,
      pephub_welcome_last_attempt_at: attemptedAt,
    })
    .eq("id", input.subscriberId)
    .eq("user_id", input.userId)
    .eq("subscribed", true)
    .in("pephub_welcome_status", ["pending", "failed"])
    .select("id, email, first_name, user_id, created_at, pephub_welcome_attempts")
    .maybeSingle();

  if (claimError) {
    console.error("[pephub welcome] claim failed", { subscriberId: input.subscriberId });
    return { outcome: "failed", reason: claimError.message };
  }

  if (!claimed) {
    const { data: current } = await supabaseAdmin
      .from("marketing_subscribers")
      .select("subscribed, pephub_welcome_status")
      .eq("id", input.subscriberId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const status = current?.pephub_welcome_status;
    if (status === "triggered") {
      console.info("[pephub welcome] duplicate prevented", { subscriberId: input.subscriberId });
      return { outcome: "already_triggered" };
    }
    if (status === "processing") return { outcome: "processing" };
    return { outcome: "skipped", reason: current?.subscribed ? "not eligible" : "opted out" };
  }

  const attempts = claimed.pephub_welcome_attempts + 1;
  await supabaseAdmin
    .from("marketing_subscribers")
    .update({ pephub_welcome_attempts: attempts })
    .eq("id", claimed.id)
    .eq("pephub_welcome_status", "processing");

  console.info("[pephub welcome] event attempt", {
    event: PEPHUB_SIGNUP_EVENT,
    subscriberId: claimed.id,
    attempt: attempts,
  });

  try {
    const accepted = await sendAutomationEvent({
      event: PEPHUB_SIGNUP_EVENT,
      email: claimed.email,
      payload: {
        first_name: claimed.first_name ?? "",
        pephub_user_id: claimed.user_id ?? input.userId,
        signup_timestamp: claimed.created_at,
        source: "pephub",
      },
    });

    const triggeredAt = new Date().toISOString();
    await supabaseAdmin
      .from("marketing_subscribers")
      .update({
        pephub_welcome_status: "triggered",
        pephub_welcome_triggered_at: triggeredAt,
        pephub_welcome_event_name: accepted.event,
        pephub_welcome_error: null,
      })
      .eq("id", claimed.id)
      .eq("pephub_welcome_status", "processing");

    await supabaseAdmin.from("email_send_log").insert({
      message_id: null,
      template_name: PEPHUB_SIGNUP_EVENT,
      recipient_email: claimed.email,
      status: "sent",
      metadata: {
        event: accepted.event,
        subscriber_id: claimed.id,
        user_id: claimed.user_id,
        accepted_at: triggeredAt,
      },
    });

    console.info("[pephub welcome] event accepted", {
      event: accepted.event,
      subscriberId: claimed.id,
    });
    return { outcome: "triggered" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const definiteRejection = /^Resend event (failed|returned an unexpected response)/.test(message);
    await supabaseAdmin
      .from("marketing_subscribers")
      .update({
        pephub_welcome_status: definiteRejection ? "failed" : "processing",
        pephub_welcome_error: message.slice(0, 500),
      })
      .eq("id", claimed.id)
      .eq("pephub_welcome_status", "processing");
    console.error("[pephub welcome] event failed", {
      event: PEPHUB_SIGNUP_EVENT,
      subscriberId: claimed.id,
      retryable: definiteRejection,
      message,
    });
    return { outcome: definiteRejection ? "failed" : "processing", reason: message };
  }
}