import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Resend sends Svix-signed webhooks. Signature format:
//   v1,<base64 hmac of "<id>.<timestamp>.<body>" using the decoded secret>
function verify(secret: string, id: string, timestamp: string, body: string, header: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return header
    .split(" ")
    .map((part) => part.split(",")[1] ?? "")
    .some((sig) => {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
}

export const Route = createFileRoute("/api/public/resend/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RESEND_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const id = request.headers.get("svix-id") ?? "";
        const timestamp = request.headers.get("svix-timestamp") ?? "";
        const signature = request.headers.get("svix-signature") ?? "";
        const body = await request.text();

        if (!id || !timestamp || !signature || !verify(secret, id, timestamp, body, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { type?: string; data?: Record<string, unknown> };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const type = payload.type ?? "";
        const data = payload.data ?? {};
        const rawEmail =
          (data["email"] as string | undefined) ??
          (Array.isArray(data["to"]) ? (data["to"] as string[])[0] : undefined);
        if (!rawEmail) return new Response("ok");
        const email = rawEmail.trim().toLowerCase();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const optOut =
          type === "contact.deleted" ||
          type === "email.bounced" ||
          type === "email.complained" ||
          (type === "contact.updated" && data["unsubscribed"] === true);
        const optIn = type === "contact.updated" && data["unsubscribed"] === false;

        if (optOut) {
          await supabaseAdmin
            .from("marketing_subscribers")
            .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
            .ilike("email", email);
        } else if (optIn) {
          await supabaseAdmin
            .from("marketing_subscribers")
            .update({ subscribed: true, unsubscribed_at: null })
            .ilike("email", email);
        }

        if (type === "contact.created" || type === "contact.updated") {
          const contactId = data["id"] as string | undefined;
          if (contactId) {
            await supabaseAdmin
              .from("marketing_subscribers")
              .update({ resend_contact_id: contactId, migrated_to_resend: true })
              .ilike("email", email);
          }
        }

        return new Response("ok");
      },
    },
  },
});
