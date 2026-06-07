// Placeholder app-email sender. Replaced by Lovable Emails once the
// sender domain is set up via the email setup dialog. The interface
// stays the same so callers (webhook, sendProtocol) don't need changes.

type SendArgs = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
};

export async function sendAppEmail(args: SendArgs): Promise<{ queued: boolean }> {
  // When the Lovable Emails route is provisioned, this will POST to
  // /lovable/email/transactional/send. Until then, log so the wiring is
  // testable in dev without throwing.
  try {
    const url = process.env.APP_BASE_URL ?? process.env.SUPABASE_URL?.replace(".supabase.co", ".lovable.app") ?? "";
    if (!url) {
      console.info("[email] queued (no base url)", args.templateName, args.recipientEmail, args.idempotencyKey);
      return { queued: true };
    }
    const res = await fetch(`${url}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LOVABLE_API_KEY ? { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}` } : {}),
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.warn(`[email] send route returned ${res.status}`, args.templateName);
      return { queued: false };
    }
    return { queued: true };
  } catch (err) {
    console.warn("[email] send failed", err);
    return { queued: false };
  }
}
