// Server-only Resend helpers. All calls go through the Lovable connector
// gateway so the Resend API key is never exposed to the browser.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type ResendContact = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  unsubscribed?: boolean;
};

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": resendKey,
  };
}

export function audienceId(): string {
  const id = process.env["RESEND_AUDIENCE_ID"];
  if (!id) throw new Error("RESEND_AUDIENCE_ID is not configured");
  return id;
}

async function call(path: string, init: { method: string; body?: unknown }) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method,
    headers: headers(),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { ok: res.ok, status: res.status, body: parsed as Record<string, unknown> | null, raw: text };
}

/** Look up a contact by email address. Returns null when absent. */
export async function getContact(email: string): Promise<ResendContact | null> {
  const res = await call(`/audiences/${audienceId()}/contacts/${encodeURIComponent(email)}`, {
    method: "GET",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    // Resend returns 404/422 for unknown contacts depending on the lookup form.
    if (res.status === 422 || res.status === 400) return null;
    throw new Error(`Resend contact lookup failed [${res.status}]: ${res.raw}`);
  }
  const data = (res.body?.["data"] ?? res.body) as ResendContact | null;
  return data && data.id ? data : null;
}

export type UpsertResult = {
  contactId: string;
  action: "created" | "updated" | "unchanged";
};

/**
 * Idempotently create or update a contact. Never resubscribes someone who is
 * opted out: `unsubscribed` is always written from our own consent record.
 */
export async function upsertContact(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  subscribed: boolean;
  knownContactId?: string | null;
}): Promise<UpsertResult> {
  const email = input.email.trim().toLowerCase();
  const payload = {
    email,
    first_name: input.firstName ?? undefined,
    last_name: input.lastName ?? undefined,
    unsubscribed: !input.subscribed,
  };

  const existing = input.knownContactId
    ? { id: input.knownContactId, email }
    : await getContact(email);

  if (existing) {
    const res = await call(`/audiences/${audienceId()}/contacts/${existing.id}`, {
      method: "PATCH",
      body: {
        first_name: payload.first_name,
        last_name: payload.last_name,
        unsubscribed: payload.unsubscribed,
      },
    });
    if (!res.ok) throw new Error(`Resend contact update failed [${res.status}]: ${res.raw}`);
    return { contactId: existing.id, action: "updated" };
  }

  const res = await call(`/audiences/${audienceId()}/contacts`, { method: "POST", body: payload });
  if (!res.ok) {
    // Race: another request created it first — fall back to update.
    const retry = await getContact(email);
    if (retry) {
      return upsertContact({ ...input, knownContactId: retry.id });
    }
    throw new Error(`Resend contact create failed [${res.status}]: ${res.raw}`);
  }
  const id = (res.body?.["id"] ?? (res.body?.["data"] as { id?: string } | undefined)?.id) as
    | string
    | undefined;
  if (!id) throw new Error(`Resend contact create returned no id: ${res.raw}`);
  return { contactId: id, action: "created" };
}
