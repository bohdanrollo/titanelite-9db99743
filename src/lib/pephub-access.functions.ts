import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signupSchema, signupMetadata, phoneSchema } from "@/lib/signup-schema";

/**
 * PepHub access requires two things: a real site account, and an active email
 * subscription in the marketing (Resend) list. Both are tracked in
 * `marketing_subscribers` — `user_id` links the account, `subscribed` the list.
 */
export const pephubAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? null;

    type SubRow = {
      id: string;
      subscribed: boolean;
      user_id: string | null;
      age_21_confirmed: boolean;
      research_use_confirmed: boolean;
    };
    const cols = "id, subscribed, user_id, age_21_confirmed, research_use_confirmed";
    let row: SubRow | null = null;

    const byUser = await supabaseAdmin
      .from("marketing_subscribers")
      .select(cols)
      .eq("user_id", context.userId)
      .maybeSingle();
    row = (byUser.data as SubRow | null) ?? null;

    if (!row && email) {
      const byEmail = await supabaseAdmin
        .from("marketing_subscribers")
        .select(cols)
        .ilike("email", email)
        .maybeSingle();
      row = (byEmail.data as SubRow | null) ?? null;
      // Link the existing subscriber record to this account.
      if (row && !row.user_id) {
        await supabaseAdmin
          .from("marketing_subscribers")
          .update({ user_id: context.userId })
          .eq("id", row.id);
      }
    }

    const acknowledged = Boolean(row?.age_21_confirmed && row?.research_use_confirmed);
    if (row?.subscribed && acknowledged) {
      const { triggerPepHubWelcome } = await import("@/lib/pephub-welcome.server");
      await triggerPepHubWelcome({ subscriberId: row.id, userId: context.userId });
    }
    return {
      hasAccount: true,
      subscribed: Boolean(row?.subscribed) && acknowledged,
      acknowledged,
      email,
    };
  });

/** Both boxes are required — the server never accepts an unchecked value. */
const acknowledgementsSchema = {
  age21: z.literal(true, {
    message: "You must confirm that you are 21 or older.",
  }),
  researchUse: z.literal(true, {
    message:
      "You must confirm you understand peptide information and sources are not for human or animal use.",
  }),
};

/** Signed-in user opts into the email list to unlock PepHub. */
export const pephubSubscribeCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ name: z.string().trim().max(120).optional(), phone: phoneSchema, marketingConsent: z.literal(true), ...acknowledgementsSchema })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!email) throw new Error("Your account has no email address.");
    const { saveSubscriber } = await import("@/lib/marketing.server");
    const subscriber = await saveSubscriber({
      email,
      name: data.name ?? (context.claims?.["user_metadata"] as { full_name?: string } | undefined)?.full_name ?? null,
      source: "pephub",
      userId: context.userId,
      acknowledgements: { age21: data.age21, researchUse: data.researchUse },
      phone: data.phone,
      marketingConsent: data.marketingConsent,
    });

    // Opting in from an existing account is still a PepHub signup. The trigger
    // claims the row atomically, so an already-triggered contact is never
    // mailed twice, and a failure here must never block PepHub access.
    if (subscriber.id) {
      try {
        const { triggerPepHubWelcome } = await import("@/lib/pephub-welcome.server");
        await triggerPepHubWelcome({ subscriberId: subscriber.id, userId: context.userId });
      } catch (err) {
        console.error("[pephub welcome] opt-in trigger failed", err);
      }
    }
    return { ok: true };
  });

/**
 * Public: create a site account AND subscribe to the email list in one step.
 * Returns whether the account already existed so the UI can ask them to log in.
 */
export const pephubSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signupSchema.parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Account creation is temporarily unavailable.");
    const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const created = await auth.auth.signUp({ email: data.email.toLowerCase(), password: data.password,
      options: { data: signupMetadata(data), emailRedirectTo: "https://peplog.io/auth" } });
    if (created.error) throw new Error(created.error.message);
    // Contact consent is stored by the lifecycle trigger only once the email is confirmed.
    return { ok: true, existingAccount: false, confirmationRequired: !created.data.session };
  });
