/**
 * Server-only helper: make sure an approved affiliate has a Titan Elite
 * account with FULL dashboard access. If no account exists for their email we
 * create a confirmed, password-less user — they set a password themselves via
 * the "Set / reset password" flow on /auth.
 */
export async function provisionAffiliateAccount(email: string, fullName?: string | null) {
  const clean = email.trim().toLowerCase();
  if (!clean) return { userId: null as string | null, created: false };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  let userId: string | null = null;
  let created = false;

  const { data: profile } = await admin
    .from("profiles").select("id").ilike("email", clean).maybeSingle();
  userId = profile?.id ?? null;

  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const match = list?.users?.find(
      (u: { id: string; email?: string | null }) => (u.email ?? "").toLowerCase() === clean,
    );
    userId = match?.id ?? null;
  }

  if (!userId) {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: clean,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? "" },
    });
    if (createErr) throw new Error(createErr.message);
    userId = newUser?.user?.id ?? null;
    created = true;
  }

  if (!userId) return { userId: null, created: false };

  // A freshly created account has no password the user knows about — always
  // email them a set-password link, otherwise sign-in fails silently for them.
  if (created) {
    try {
      await admin.auth.resetPasswordForEmail(clean, {
        redirectTo: "https://titanelite.org/reset-password",
      });
    } catch (e) {
      console.warn("[affiliate provision] set-password email failed", e);
    }
  }


  for (const environment of ["sandbox", "live"] as const) {
    const { data: existing } = await admin
      .from("user_access")
      .select("id, tier")
      .eq("user_id", userId)
      .eq("environment", environment)
      .maybeSingle();
    if (existing) {
      if (existing.tier === "full") continue;
      await admin.from("user_access")
        .update({ tier: "full", stripe_price_id: "affiliate_comp", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin.from("user_access").insert({
        user_id: userId, tier: "full", stripe_price_id: "affiliate_comp", environment,
      });
    }
  }

  return { userId, created };
}
