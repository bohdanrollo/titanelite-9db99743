import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

const TIER_BY_PRICE: Record<string, "limited" | "full"> = {
  limited_access_onetime: "limited",
  full_access_lifetime: "full",
};

interface CheckoutSession {
  id: string;
  customer: string | { id: string } | null;
  payment_intent: string | { id: string } | null;
  metadata?: { userId?: string; tier?: string } | null;
  payment_status?: string;
}

interface Charge {
  id: string;
  payment_intent: string | { id: string } | null;
  refunded?: boolean;
  amount_refunded?: number;
  amount?: number;
}

async function handleCheckoutCompleted(session: CheckoutSession, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const priceLookup = session.metadata?.tier;
  if (!userId || !priceLookup) {
    console.error("[webhook] missing userId or tier metadata on session", session.id);
    return;
  }
  const tier = TIER_BY_PRICE[priceLookup];
  if (!tier) {
    console.error("[webhook] unknown tier for price", priceLookup);
    return;
  }
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = getSupabase() as any;
  const { data: existing } = await supa
    .from("user_access")
    .select("id, tier")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();

  if (existing) {
    const currentTier = existing.tier as "limited" | "full";
    if (currentTier === "full") return; // already at highest tier
    if (tier === "full") {
      await supa
        .from("user_access")
        .update({
          tier,
          stripe_price_id: priceLookup,
          stripe_customer_id: customerId,
          stripe_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          environment: env,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    return;
  }

  await supa.from("user_access").insert({
    user_id: userId,
    tier,
    stripe_price_id: priceLookup,
    stripe_customer_id: customerId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    environment: env,
  });
}

async function handleChargeRefunded(charge: Charge, env: StripeEnv) {
  const fullyRefunded =
    charge.refunded === true ||
    (typeof charge.amount === "number" &&
      typeof charge.amount_refunded === "number" &&
      charge.amount_refunded >= charge.amount);
  if (!fullyRefunded) {
    console.log("[webhook] partial refund ignored", charge.id);
    return;
  }
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
  if (!paymentIntentId) {
    console.error("[webhook] refund has no payment_intent", charge.id);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = getSupabase() as any;
  const { data: rows, error } = await supa
    .from("user_access")
    .select("id, user_id, tier")
    .eq("environment", env)
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (error) {
    console.error("[webhook] refund lookup failed", error);
    return;
  }
  if (!rows?.length) {
    console.log("[webhook] refund had no matching access row", paymentIntentId);
    return;
  }
  await supa.from("user_access").delete().eq("stripe_payment_intent_id", paymentIntentId).eq("environment", env);
  console.log("[webhook] revoked access for refund", { paymentIntentId, count: rows.length });
}

// Newer sessions store payment_intent inline; older ones may need a lookup.
async function ensurePaymentIntent(session: CheckoutSession, env: StripeEnv): Promise<CheckoutSession> {
  if (session.payment_intent) return session;
  try {
    const stripe = createStripeClient(env);
    const full = await stripe.checkout.sessions.retrieve(session.id);
    return { ...session, payment_intent: (full.payment_intent as string | null) ?? null };
  } catch (e) {
    console.error("[webhook] failed to hydrate payment_intent", e);
    return session;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[webhook] invalid env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded": {
              const session = await ensurePaymentIntent(event.data.object as CheckoutSession, env);
              await handleCheckoutCompleted(session, env);
              break;
            }
            case "charge.refunded":
              await handleChargeRefunded(event.data.object as Charge, env);
              break;
            default:
              console.log("[webhook] unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
