import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const TIER_BY_PRICE: Record<string, "limited" | "full"> = {
  limited_access_onetime: "limited",
  full_access_lifetime: "full",
  full_access_upgrade: "full",
  limited_monthly: "limited",
  full_monthly: "full",
};

const LIFETIME_PRICES = new Set([
  "limited_access_onetime",
  "full_access_lifetime",
  "full_access_upgrade",
  "admin_grant_limited",
  "admin_grant_full",
  "affiliate_comp",
  "admin_comp",
  "comp_grandfathered",
]);

const ACTIVE = new Set(["active", "trialing", "past_due"]);

/**
 * Reconcile Stripe subscriptions with user_access so every paying customer
 * shows up in the admin dashboard, even if a webhook was missed.
 */
export const syncStripeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const env = data.environment;

    let granted = 0;
    let upgraded = 0;
    let unmatched = 0;
    let scanned = 0;

    try {
      const stripe = createStripeClient(env);

      for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] })) {
        scanned++;
        if (!ACTIVE.has(sub.status)) continue;

        // Resolve the tier from the subscription's price lookup keys.
        let tier: "limited" | "full" | null = null;
        let priceLookup: string | null = null;
        for (const item of sub.items?.data ?? []) {
          const lk = item.price?.lookup_key ?? item.price?.metadata?.["lovable_external_id"];
          const t = lk ? TIER_BY_PRICE[lk] : undefined;
          if (!t) continue;
          if (!tier || (t === "full" && tier !== "full")) { tier = t; priceLookup = lk ?? null; }
        }
        if (!tier) continue;

        // Resolve the app user: subscription metadata → customer metadata → email.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customer = sub.customer as any;
        const customerId = typeof customer === "string" ? customer : customer?.id ?? null;
        let appUserId: string | null = sub.metadata?.["userId"] ?? null;
        if (!appUserId && customer && typeof customer === "object") {
          appUserId = customer.metadata?.userId ?? null;
          if (!appUserId && customer.email) {
            const { data: prof } = await admin
              .from("profiles").select("id").ilike("email", customer.email).maybeSingle();
            appUserId = prof?.id ?? null;
          }
        }
        if (!appUserId) { unmatched++; continue; }

        const { data: existing } = await admin
          .from("user_access")
          .select("id, tier, stripe_price_id")
          .eq("user_id", appUserId)
          .eq("environment", env)
          .maybeSingle();

        const payload = {
          user_id: appUserId,
          tier,
          stripe_price_id: priceLookup,
          stripe_customer_id: customerId,
          stripe_payment_intent_id: sub.id,
          environment: env,
          updated_at: new Date().toISOString(),
        };

        if (!existing) {
          await admin.from("user_access").insert(payload);
          granted++;
          continue;
        }
        if (existing.stripe_price_id && LIFETIME_PRICES.has(existing.stripe_price_id)) continue;
        if (existing.tier === tier && existing.stripe_price_id === priceLookup) continue;
        if (existing.tier === "full" && tier === "limited") continue;
        await admin.from("user_access").update(payload).eq("id", existing.id);
        upgraded++;
      }
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }

    return { scanned, granted, upgraded, unmatched };
  });
