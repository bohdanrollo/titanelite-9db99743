import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

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
  metadata?: { userId?: string; tier?: string } | null;
  payment_status?: string;
  line_items?: unknown;
}

async function handleCheckoutCompleted(session: CheckoutSession, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const priceLookup = session.metadata?.tier;
  if (!userId || !priceLookup) {
    console.error("Missing userId or tier metadata on session");
    return;
  }
  const tier = TIER_BY_PRICE[priceLookup];
  if (!tier) {
    console.error("Unknown tier for price", priceLookup);
    return;
  }
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  // Upgrade rule: only overwrite an existing row if the new tier is 'full'
  // (upgrade from limited → full). Never downgrade.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = getSupabase() as any;
  const { data: existing } = await supa
    .from("user_access")
    .select("id, tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const currentTier = existing.tier as "limited" | "full";
    if (currentTier === "full") return;
    if (tier === "full") {
      await supa
        .from("user_access")
        .update({
          tier,
          stripe_price_id: priceLookup,
          stripe_customer_id: customerId,
          stripe_session_id: session.id,
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
    environment: env,
  });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Invalid env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await handleCheckoutCompleted(
                event.data.object as CheckoutSession,
                env,
              );
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
