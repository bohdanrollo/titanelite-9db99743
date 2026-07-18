// Server-side helper to enqueue a transactional email via the internal
// /lovable/email/transactional/send route. Forwards the caller's Supabase
// bearer token so the route can authenticate the request.

type SendArgs = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  authHeader?: string | null;
};

function resolveBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Prefer the stable published URL on production; fall back to the local dev server.
  return "https://titanelite.lovable.app";
}

export async function sendAppEmail(args: SendArgs): Promise<{ queued: boolean }> {
  try {
    const base = resolveBaseUrl();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (args.authHeader) headers.Authorization = args.authHeader;

    const res = await fetch(`${base}/lovable/email/transactional/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        templateName: args.templateName,
        recipientEmail: args.recipientEmail,
        idempotencyKey: args.idempotencyKey,
        templateData: args.templateData ?? {},
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[email] send route ${res.status}`, args.templateName, body.slice(0, 300));
      return { queued: false };
    }
    return { queued: true };
  } catch (err) {
    console.warn("[email] send failed", err);
    return { queued: false };
  }
}
