import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });
        const body = await request.text();

        const { getStripe, getWebhookSecret } = await import("@/lib/stripe.server");
        const stripe = getStripe();

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, getWebhookSecret());
        } catch (err) {
          console.error("[stripe-webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendAppEmail } = await import("@/lib/email/send.server");

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object;
              const purchaseId = s.metadata?.purchase_id;
              const userId = s.metadata?.user_id;
              const tier = s.metadata?.tier;
              const intakeId = s.metadata?.intake_id || null;

              if (purchaseId) {
                await supabaseAdmin.from("purchases").update({
                  status: "paid",
                  stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : null,
                  stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
                  amount_cents: s.amount_total ?? undefined,
                  currency: s.currency ?? "usd",
                }).eq("id", purchaseId);
              }

              if (intakeId) {
                await supabaseAdmin.from("intakes").update({ status: "paid" }).eq("id", intakeId);
              }

              if (userId) {
                const { data: profile } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
                if (profile?.email) {
                  await sendAppEmail({
                    templateName: "welcome",
                    recipientEmail: profile.email,
                    idempotencyKey: `welcome-${purchaseId}`,
                    templateData: { name: profile.full_name ?? "", tier },
                  });
                  await sendAppEmail({
                    templateName: "intake-received",
                    recipientEmail: profile.email,
                    idempotencyKey: `intake-received-${purchaseId}`,
                    templateData: { name: profile.full_name ?? "", tier },
                  });
                }
              }
              break;
            }
            case "invoice.payment_succeeded": {
              const inv = event.data.object;
              // Skip the first invoice (already covered by checkout welcome email)
              if (inv.billing_reason === "subscription_create") break;
              const subId = typeof inv.subscription === "string" ? inv.subscription : null;
              if (!subId) break;
              const { data: purchase } = await supabaseAdmin
                .from("purchases").select("id, user_id, tier, last_invoice_id")
                .eq("stripe_subscription_id", subId).maybeSingle();
              if (!purchase) break;
              if (purchase.last_invoice_id === inv.id) break;
              await supabaseAdmin.from("purchases").update({ last_invoice_id: inv.id }).eq("id", purchase.id);
              const { data: profile } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", purchase.user_id).maybeSingle();
              if (profile?.email) {
                await sendAppEmail({
                  templateName: "renewal",
                  recipientEmail: profile.email,
                  idempotencyKey: `renewal-${inv.id}`,
                  templateData: {
                    name: profile.full_name ?? "",
                    tier: purchase.tier,
                    amount: (inv.amount_paid / 100).toFixed(2),
                    currency: (inv.currency ?? "usd").toUpperCase(),
                  },
                });
              }
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object;
              await supabaseAdmin.from("purchases").update({
                status: "canceled",
                canceled_at: new Date().toISOString(),
              }).eq("stripe_subscription_id", sub.id);
              break;
            }
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", event.type, err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
