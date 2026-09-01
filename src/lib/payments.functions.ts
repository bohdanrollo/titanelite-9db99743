import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { priceId: string; returnUrl: string; environment: StripeEnv; refCode?: string }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { userId, supabase } = context;
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email ?? undefined;

      const stripe = createStripeClient(data.environment);

      // Resolve the primary (recurring) price by lookup key.
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const primary = prices.data[0];

      // Full plan: charge $59.99 initial fee on the first invoice alongside
      // the recurring $10.99/month. Limited plan: recurring only.
      const lineItems: { price: string; quantity: number }[] = [
        { price: primary.id, quantity: 1 },
      ];
      if (data.priceId === "full_monthly") {
        const feeLookup = await stripe.prices.list({ lookup_keys: ["full_initial_fee"] });
        if (feeLookup.data.length) {
          lineItems.push({ price: feeLookup.data[0].id, quantity: 1 });
        }
      }

      const refCode = (data.refCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });
      const isRecurring = primary.type === "recurring";

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        allow_promotion_codes: true,
        metadata: { userId, tier: data.priceId, ...(refCode && { refCode }) },
        ...(isRecurring && {
          subscription_data: {
            metadata: { userId, tier: data.priceId, ...(refCode && { refCode }) },
          },
        }),
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type PortalSessionResult = { url: string } | { error: string };

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    try {
      const { supabase, userId } = context;

      const { data: access } = await supabase
        .from("user_access")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .not("stripe_customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const stripe = createStripeClient(data.environment);

      let customerId = (access as { stripe_customer_id?: string } | null)?.stripe_customer_id;
      if (!customerId) {
        const { data: userRes } = await supabase.auth.getUser();
        const email = userRes.user?.email ?? undefined;
        const found = await stripe.customers.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 1,
        });
        if (found.data.length) customerId = found.data[0].id;
        else if (email) {
          const existing = await stripe.customers.list({ email, limit: 1 });
          if (existing.data.length) customerId = existing.data[0].id;
        }
      }

      if (!customerId) {
        return { error: "No billing account found for your login. Contact support if you believe this is an error." };
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
