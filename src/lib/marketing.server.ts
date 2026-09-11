import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function splitName(name: string) {
  const clean = (name ?? "").trim().replace(/\s+/g, " ");
  const space = clean.indexOf(" ");
  if (space === -1) return { first: clean || null, last: null };
  return { first: clean.slice(0, space), last: clean.slice(space + 1) };
}

/**
 * Store a marketing subscriber locally first (so a Resend outage never loses a
 * signup), then push the contact into the Resend audience. Idempotent by email.
 */
export async function saveSubscriber(input: {
  email: string;
  name?: string | null;
  source?: string;
  userId?: string | null;
  /** Both must be true when the person is confirming at signup / opt-in. */
  acknowledgements?: { age21: boolean; researchUse: boolean } | null;
}) {
  const email = input.email.trim().toLowerCase();
  const { first, last } = splitName(input.name ?? "");
  const ack =
    input.acknowledgements?.age21 && input.acknowledgements?.researchUse
      ? {
          age_21_confirmed: true,
          research_use_confirmed: true,
          acknowledgements_confirmed_at: new Date().toISOString(),
        }
      : {};

  const { data: existing } = await supabaseAdmin
    .from("marketing_subscribers")
    .select("id, subscribed, resend_contact_id, first_name, last_name")
    .ilike("email", email)
    .maybeSingle();

  let rowId = existing?.id as string | undefined;
  if (rowId) {
    await supabaseAdmin
      .from("marketing_subscribers")
      .update({
        first_name: first ?? existing?.first_name ?? null,
        last_name: last ?? existing?.last_name ?? null,
        subscribed: true,
        unsubscribed_at: null,
        resend_sync_status: "pending",
        ...(input.userId ? { user_id: input.userId } : {}),
      })
      .eq("id", rowId);
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("marketing_subscribers")
      .insert({
        email,
        first_name: first,
        last_name: last,
        subscribed: true,
        source: input.source ?? "pephub",
        resend_sync_status: "pending",
        ...(input.userId ? { user_id: input.userId } : {}),
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    rowId = inserted?.id as string | undefined;
  }

  try {
    const { upsertContact } = await import("@/lib/resend.server");
    const res = await upsertContact({
      email,
      firstName: first,
      lastName: last,
      subscribed: true,
      knownContactId: existing?.resend_contact_id ?? null,
    });
    if (rowId) {
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          resend_contact_id: res.contactId,
          migrated_to_resend: true,
          resend_sync_status: "synced",
          resend_sync_error: null,
          resend_last_synced_at: new Date().toISOString(),
        })
        .eq("id", rowId);
    }
  } catch (err) {
    console.error("[marketing] resend sync failed", err);
    if (rowId) {
      await supabaseAdmin
        .from("marketing_subscribers")
        .update({
          resend_sync_status: "failed",
          resend_sync_error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", rowId);
    }
  }

  return { id: rowId };
}
