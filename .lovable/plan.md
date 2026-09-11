# Connect PepHub Signup to the Existing Resend Automation

## Goal
Trigger the existing enabled Resend Automation event `pephub.signup` for only the newly created PepHub user, while preserving the current account, consent, audience-sync, access, and admin systems.

## Verified Existing Setup
- PepHub signup is submitted from `/pephub` and handled by the existing `pephubSignup` server function.
- That function creates the existing Titan Elite account, then saves and syncs the person through the existing `marketing_subscribers` record.
- `RESEND_API_KEY` and `RESEND_AUDIENCE_ID` are already configured server-side through the existing Resend connection.
- Resend’s `pephub.signup` custom event exists, and the enabled “PepHub welcome email” Automation listens for it.
- Resend officially supports `POST /events/send` with exactly one `email` or `contact_id`. A successful request returns `202` and the event name, but no unique event-run ID.

## Implementation
1. **Add PepHub-specific workflow tracking**
   - Extend the existing `marketing_subscribers` table rather than creating another subscriber or email system.
   - Add PepHub welcome status, triggered timestamp, event name, error, and attempt count fields.
   - Initialize all existing records as `skipped`, ensuring installation cannot email existing users.

2. **Add the server-only Resend event call**
   - Extend the existing Resend server helper with a call to `/events/send` through the already-linked Resend connection.
   - Hard-code the trusted event name `pephub.signup` in server code; the browser cannot choose an event or recipient.
   - Send the new account’s server-confirmed email plus first name, user ID, signup timestamp, and `source: pephub` payload.

3. **Replace only PepHub’s old welcome delivery**
   - Keep account creation, authentication, profile creation, subscriber consent, Resend contact sync, and PepHub access unchanged.
   - Remove PepHub’s call to the direct Broadcast-content welcome sender.
   - Trigger the Automation only when account creation truly returns a new user; existing-account login and opt-in paths do not trigger it.
   - A Resend failure never fails or rolls back account creation.

4. **Prevent duplicates and support retries**
   - Atomically claim an eligible `pending` or `failed` PepHub welcome row before calling Resend.
   - Treat `triggered`, `processing`, and `skipped` as duplicate-protected states.
   - Record successful acceptance, failures, and attempts. Failed rows remain eligible for an admin retry.
   - Because Resend does not document idempotency keys for `/events/send`, ambiguous network outcomes remain `processing` rather than being automatically retried and risking a duplicate.

5. **Enhance the existing Email Marketing admin area**
   - Add PepHub Automation status, trigger time, event name, attempts, and errors to the existing subscriber table.
   - Add a row-level retry action only for failed PepHub events; do not add any mass-send capability.
   - Remove the PepHub dependency on the old Broadcast welcome mechanism without changing the standard Titan Elite signup email flow.

## Validation
- Type-check the updated application.
- Create one new test PepHub account using a unique alias of the existing test inbox.
- Confirm the account/profile and subscriber linkage, one accepted `pephub.signup` event, Automation run, delivery to only that alias, and recorded admin status.
- Re-run the trigger to confirm duplicate prevention.
- Sign in as an existing user and confirm no event is sent.
- Exercise a controlled failure path and confirm account creation remains successful, status becomes failed, and admin retry is available.

## Technical Note
Resend’s send-event response contains no event ID. The app will record the exact event name and acceptance timestamp, but will not invent an ID. Delivery/run evidence will be verified from the existing Resend Automation after the test.
