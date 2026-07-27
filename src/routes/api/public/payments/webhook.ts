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
  // Legacy one-time products (kept so old webhooks + admin actions still work)
  limited_access_onetime: "limited",
  full_access_lifetime: "full",
  full_access_upgrade: "full",
  // Subscription products
  limited_monthly: "limited",
  full_monthly: "full",
};

// Access-granting price IDs that should never be overwritten/downgraded by
// a subscription event (grandfathered lifetime buyers, admin grants).
const LIFETIME_PRICES = new Set([
  "limited_access_onetime",
  "full_access_lifetime",
  "full_access_upgrade",
  "admin_grant_limited",
  "admin_grant_full",
]);

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

interface Subscription {
  id: string;
  status: string;
  customer: string | { id: string } | null;
  metadata?: { userId?: string; tier?: string } | null;
  items?: { data: Array<{ price: { id: string; lookup_key?: string | null; metadata?: Record<string, string> | null } }> };
}

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

function resolveSubTier(sub: Subscription): { tier: "limited" | "full"; priceLookup: string } | null {
  const items = sub.items?.data ?? [];
  // Pick the item whose lookup_key maps to a known tier (prefer highest = full).
  let best: { tier: "limited" | "full"; priceLookup: string } | null = null;
  for (const it of items) {
    const lk = it.price?.lookup_key || it.price?.metadata?.lovable_external_id;
    if (!lk) continue;
    const t = TIER_BY_PRICE[lk];
    if (!t) continue;
    if (!best || (t === "full" && best.tier !== "full")) best = { tier: t, priceLookup: lk };
  }
  return best;
}

async function handleSubscriptionChange(sub: Subscription, env: StripeEnv) {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.error("[webhook] subscription missing userId metadata", sub.id);
    return;
  }
  const resolved = resolveSubTier(sub);
  const isActive = ACTIVE_SUB_STATUSES.has(sub.status);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = getSupabase() as any;
  const { data: existing } = await supa
    .from("user_access")
    .select("id, tier, stripe_price_id, stripe_payment_intent_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();

  // Cancellation / non-active status: revoke only if the row belongs to THIS subscription.
  if (!isActive) {
    if (existing && existing.stripe_payment_intent_id === sub.id) {
      await supa.from("user_access").delete().eq("id", existing.id);
      console.log("[webhook] revoked access for ended subscription", sub.id);
    }
    return;
  }

  if (!resolved) {
    console.error("[webhook] could not resolve tier for subscription", sub.id);
    return;
  }

  // Don't overwrite a lifetime/admin-granted row.
  if (existing && existing.stripe_price_id && LIFETIME_PRICES.has(existing.stripe_price_id)) {
    return;
  }

  const payload = {
    user_id: userId,
    tier: resolved.tier,
    stripe_price_id: resolved.priceLookup,
    stripe_customer_id: customerId,
    stripe_session_id: null as string | null,
    stripe_payment_intent_id: sub.id,
    environment: env,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supa.from("user_access").update(payload).eq("id", existing.id);
  } else {
    await supa.from("user_access").insert(payload);
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
              const session = event.data.object as CheckoutSession;
              // Subscription sessions are handled by customer.subscription.* events.
              // Only run legacy one-time handling if there's no subscription attached.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const anySession = session as any;
              if (anySession.mode === "subscription" || anySession.subscription) break;
              const withPi = await ensurePaymentIntent(session, env);
              await handleCheckoutCompleted(withPi, env);
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
              await handleSubscriptionChange(event.data.object as Subscription, env);
              break;
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
