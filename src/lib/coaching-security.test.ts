import { test } from "node:test";
import { strict as assert } from "node:assert";
import postgres from "postgres";

// Integration checks are rolled back, never changing real coaching records.
const connection = process.env.SUPABASE_DB_URL;
const rollback = new Error("security test rollback");
async function checkCoachChange(change: "approve" | "profile" | "appointment" | "admin") {
  if (!connection) throw new Error("Database test connection is required");
  const db = postgres(connection, { max: 1, prepare: false });
  let passed = false;
  try {
    await db.begin(async (tx) => {
      const [user] = await tx`select id from public.profiles where not exists (select 1 from public.user_roles where user_id = public.profiles.id and role = 'admin') limit 1`;
      const [admin] = await tx`select user_id as id from public.user_roles where role = 'admin' limit 1`;
      if (!user || !admin) throw new Error("Existing member and admin required for security checks");
      await tx`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`;
      const [coach] = await tx`insert into public.coaches (user_id, email) values (${user.id}, 'security-check@example.invalid') on conflict (user_id) do update set bio = public.coaches.bio returning id`;
      if (!coach) throw new Error("Could not prepare coach check");
      const [appointment] = await tx`insert into public.coach_appointments (coach_id, client_id, start_time, end_time) values (${coach.id}, ${user.id}, now() + interval '1 year', now() + interval '1 year 30 minutes') returning id`;
      if (!appointment) throw new Error("Could not prepare appointment check");
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: change === "admin" ? admin.id : user.id, role: "authenticated" })}, true)`;
      // This restricted test connection cannot SET ROLE. The triggers themselves
      // run as security definers and authorize against these request claims.
      if (change === "approve" || change === "admin") {
        await tx`update public.coaches set status = 'approved' where id = ${coach.id}`;
      } else if (change === "profile") {
        const rows = await tx`update public.coaches set bio = 'Security test profile edit' where id = ${coach.id} returning bio`;
        assert.equal(rows[0]?.bio, "Security test profile edit");
      } else {
        await tx`update public.coach_appointments set duration_minutes = 90 where id = ${appointment.id}`;
      }
      passed = true;
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await db.end();
  }
  assert.equal(passed, true);
}

test("members cannot self-approve as coaches", { skip: !connection }, async () => {
  await assert.rejects(checkCoachChange("approve"), { code: "42501", message: "Only administrators can change coach approval or ownership" });
});
test("coaches retain normal profile editing", { skip: !connection }, async () => {
  await checkCoachChange("profile");
});
test("coaches cannot rewrite appointment durations", { skip: !connection }, async () => {
  await assert.rejects(checkCoachChange("appointment"), { code: "42501", message: "Coaches can only update appointment status" });
});
test("existing admins retain coach approval", { skip: !connection }, async () => {
  await checkCoachChange("admin");
});