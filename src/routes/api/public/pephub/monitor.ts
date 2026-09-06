import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side scheduled monitoring endpoint.
 * Called by the database cron job (pg_cron + pg_net) — never by the browser.
 * Authorized with the service-role bearer token.
 */
export const Route = createFileRoute("/api/public/pephub/monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { runDueMonitoring } = await import("@/lib/pephub-monitor.server");
          const result = await runDueMonitoring({ triggeredBy: "cron" });
          let inbox: unknown = null;
          try {
            const { scanVendorInbox } = await import("@/lib/pephub-inbox.server");
            inbox = await scanVendorInbox("cron");
          } catch (err) {
            console.error("[pephub-inbox] scan failed", err);
          }
          return Response.json({ ok: true, ...result, inbox });
        } catch (err) {
          console.error("[pephub-monitor] run failed", err);
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
