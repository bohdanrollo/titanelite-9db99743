import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .object({ name: z.string().trim().max(120).optional(), ...acknowledgementsSchema })
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
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(200),
        password: z.string().min(8).max(200),
        website: z.string().max(0).optional(), // honeypot
        ...acknowledgementsSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true, existingAccount: false };

    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    let existingAccount = false;

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.name.trim(),
        age_21_confirmed: true,
        research_use_confirmed: true,
      },
    });

    if (created.error) {
      const msg = created.error.message ?? "";
      if (/already|exists|registered/i.test(msg)) {
        existingAccount = true;
      } else {
        throw new Error(msg || "Could not create your account.");
      }
    } else {
      userId = created.data.user?.id ?? null;
    }

    const { saveSubscriber } = await import("@/lib/marketing.server");
    const subscriber = await saveSubscriber({
      email,
      name: data.name,
      source: "pephub",
      userId,
      acknowledgements: { age21: data.age21, researchUse: data.researchUse },
    });

    if (!existingAccount && userId && subscriber.id) {
      console.info("[pephub signup] account created", { userId, subscriberId: subscriber.id });
      const { triggerPepHubWelcome } = await import("@/lib/pephub-welcome.server");
      await triggerPepHubWelcome({ subscriberId: subscriber.id, userId, isNewSignup: true });
    }

    return { ok: true, existingAccount };
  });
