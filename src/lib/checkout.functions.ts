import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STRIPE_PRICES, type TierId } from "./stripe-config";

const Input = z.object({
  tier: z.enum(["Foundation", "Elite", "Apex"]),
  intakeId: z.string().uuid().optional(),
  origin: z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const tier = data.tier as TierId;
    const cfg = STRIPE_PRICES[tier];

    // Create pending purchase row (user-scoped via RLS)
    const { data: purchase, error: pErr } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        tier,
        amount_cents: cfg.amountCents,
        stripe_price_id: cfg.priceId,
        status: "pending",
      })
      .select("id")
      .single();
    if (pErr) throw new Error(`Failed to create purchase: ${pErr.message}`);

    // Link intake to purchase if provided
    if (data.intakeId) {
      await supabase
        .from("intakes")
        .update({ purchase_id: purchase.id })
        .eq("id", data.intakeId)
        .eq("user_id", userId);
    }

    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: cfg.mode,
      payment_method_types: ["card"],
      line_items: [{ price: cfg.priceId, quantity: 1 }],
      customer_email: claims.email as string | undefined,
      success_url: `${data.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/checkout?plan=${tier}`,
      metadata: {
        purchase_id: purchase.id,
        user_id: userId,
        tier,
        intake_id: data.intakeId ?? "",
      },
      subscription_data: cfg.mode === "subscription" ? {
        metadata: { purchase_id: purchase.id, user_id: userId, tier },
      } : undefined,
    });

    // Save session id for webhook reconciliation
    await supabase
      .from("purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchase.id);

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url, purchaseId: purchase.id };
  });
