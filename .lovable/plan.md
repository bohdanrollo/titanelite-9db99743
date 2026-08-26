# Discord notifications for paid referrals and approved sub-affiliates

## What the code does today (verified)

### Where a referral row is inserted
Only one place in the whole app inserts into `public.affiliate_referrals`:
`attributeAffiliateFromSession()` in `src/routes/api/public/payments/webhook.ts`.

Flow, on Stripe `checkout.session.completed` / `checkout.session.async_payment_succeeded`
(skipped when `payment_status === "unpaid"`, so only paid checkouts count):

1. Requires `session.metadata.userId`.
2. Re-retrieves the session from Stripe with `expand: ["discounts.promotion_code"]`.
3. Builds a candidate code list: promo codes used at checkout, plus `metadata.refCode`
   (the `?ref=` link code carried through checkout).
4. For each code (normalized to A-Z0-9, max 20): looks up `affiliates` where
   `code = ...` and `status = 'approved'`. Skips self-referrals (`aff.user_id === userId`).
5. Inserts `{ affiliate_id, referred_user_id, code_used }` into `affiliate_referrals`,
   using the service-role client. Duplicate/unique errors are swallowed; other errors
   are logged. Then `return` — one affiliate per buyer.

### Is it in a transaction?
No application-level transaction. It's a single PostgREST insert over HTTP, so the only
transaction is Postgres' implicit per-statement one. Inside that statement,
the `AFTER INSERT` row trigger `trg_referrals_recompute` fires
`recompute_affiliate_totals()`, which in the same implicit transaction:
- increments `affiliates.referral_count`,
- every 5th referral adds `payout_cents_per_5` (default 2500) to `earnings_cents`,
- and, if the affiliate has a `recruiter_affiliate_id`, adds $5 (500 cents) to that
  recruiter's `recruit_earnings_cents`.

So: the insert plus all totals updates are atomic together; nothing else in the webhook is.
`DELETE` decrements `referral_count` only.

### Affiliate approval and recruiter assignment
- Applications are inserted client-side in `src/routes/affiliate.tsx` (`status: 'pending'`),
  and `recruiter_affiliate_id` is set at that moment from the `?recruit=<CODE>` query param,
  resolved through the `resolveRecruiterCode` server function (approved affiliates only).
  It is never assigned later.
- Approval happens in `approveAffiliate` in `src/lib/affiliates.functions.ts`: admin-only,
  validates/uniquifies the code, links `user_id` by email, sets
  `status = 'approved'`, `code`, `approved_at`, then best-effort sends the
  `affiliate-approved` email. A "sub-affiliate" is simply an approved affiliate whose
  `recruiter_affiliate_id` is non-null.

## Plan

### 1. Discord webhook secret
Add a `DISCORD_WEBHOOK_URL` secret (asked for at implementation time). All posting is
server-side only and best-effort — a Discord failure must never fail a Stripe webhook
or an approval.

### 2. Shared notifier
New `src/lib/discord.server.ts` exporting `sendDiscordNotification({ title, description, fields, color })`,
which POSTs an embed to the webhook URL, wrapped in try/catch with a short timeout and a
`console.warn` on failure. Returns void, never throws.

### 3. Notification 1 — newly credited paid referral
In `attributeAffiliateFromSession`, immediately after an insert succeeds with no error
(so duplicates never re-notify), fire the notifier with: affiliate name/email + code,
the referred user's email (looked up from `profiles`), the plan/tier if resolvable from
the session, the affiliate's new `referral_count`, and whether this referral crossed a
5-signup payout milestone. `await` it but keep it inside the existing try/catch so the
webhook still returns 200.

### 4. Notification 2 — newly approved sub-affiliate
In `approveAffiliate`, after the status update succeeds and only when the affiliate's
`recruiter_affiliate_id` is non-null, look up the recruiter's name/code and post: new
sub-affiliate name, email, assigned code, referral URL, and the recruiting parent
affiliate. Best-effort, alongside the existing email send.

### Notes
- No database changes are needed; both hooks live in existing server code paths.
- Regular (non-recruited) approvals stay silent per the request; easy to widen later.
