# Stripe + Emails + PDF Protocols — Build Plan

Three integrated systems wired into the existing intake → review → protocol flow.

---

## 1. Stripe Checkout (Bring-your-own-key)

**Setup**
- Ask you for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` via the secrets dialog.
- You'll create three Stripe products/prices in your dashboard and paste the price IDs:
  - Foundation — $59 one-time
  - Elite — $199/month
  - Apex — $399/month
- Store IDs in `src/lib/stripe-config.ts` (just public references, no secrets).

**Flow**
1. User submits intake → `purchases` row created (status `pending`).
2. Redirects to `/checkout?plan=elite` → "Pay now" button calls `createCheckoutSession` server fn.
3. Server fn creates Stripe Checkout Session (mode: `payment` for Foundation, `subscription` for Elite/Apex), passes intake_id + user_id in metadata, returns URL.
4. Browser redirects to Stripe-hosted checkout.
5. Webhook at `/api/public/stripe-webhook` (signature-verified) handles:
   - `checkout.session.completed` → mark `purchases.status = 'paid'`, fire welcome email + intake-received email, notify admin.
   - `invoice.payment_succeeded` (subs) → fire renewal email (skip first invoice).
   - `customer.subscription.deleted` → mark canceled.
6. Success page `/checkout/success` confirms and links to dashboard.

---

## 2. Email Automation (Lovable Emails)

**Setup (you do once)**
- I'll trigger the email setup dialog → you configure your sender domain & DNS.
- I'll then call `setup_email_infra` + `scaffold_transactional_email` to provision queue, send route, unsubscribe page.

**Templates** (`src/lib/email-templates/`) — branded with Titan Elite design tokens:
1. `welcome.tsx` — sent on first paid checkout. "Welcome to Titan Elite. Here's what happens next."
2. `intake-received.tsx` — sent immediately after intake submit. Confirms receipt + 48h review window.
3. `protocol-ready.tsx` — sent when coach clicks "Send to client" in admin. Contains link to dashboard + PDF attachment link.
4. `renewal.tsx` — sent on each successful subscription renewal (Elite/Apex). Receipt summary + next cycle date.

All triggers use the queued `sendTransactionalEmail` helper with idempotency keys.

---

## 3. AI-Drafted PDF Protocols

**Generation**
- Admin opens an intake in `/admin` → "Generate draft protocol" button.
- Calls `generateProtocolDraft` server fn → Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output schema:
  - `training_block` (weeks, split, key lifts, progression)
  - `peptide_protocol` (educational, with disclaimer text)
  - `nutrition_notes`
  - `recovery_notes`
- Saves draft JSON to `protocols.draft_content`.

**Coach review**
- Editable form in admin shows the draft fields, coach edits as needed.
- "Save draft" updates the row. "Approve & send" does:
  1. Render PDF server-side (pdf-lib, no native deps — Worker-safe) with Titan Elite branding.
  2. Upload to `client-uploads` bucket at `protocols/{user_id}/{protocol_id}.pdf` (signed URL, 7-day expiry).
  3. Update `protocols.status = 'delivered'`, `pdf_url`, `delivered_at`.
  4. Fire `protocol-ready` email with the signed link.

**Client view**
- `/dashboard` shows delivered protocols with download buttons (signed URL regenerated server-side on click so links don't go stale).

---

## Technical details

**New files**
- `src/lib/stripe.server.ts` — Stripe SDK init, helpers
- `src/lib/stripe-config.ts` — public price ID map
- `src/lib/checkout.functions.ts` — `createCheckoutSession` server fn
- `src/routes/api/public/stripe-webhook.ts` — signature-verified webhook
- `src/routes/checkout.success.tsx` — post-payment landing
- `src/lib/email-templates/{welcome,intake-received,protocol-ready,renewal}.tsx`
- `src/lib/email/send.ts` — thin client helper
- `src/lib/protocols.functions.ts` — `generateProtocolDraft`, `sendProtocol`, `getProtocolDownloadUrl`
- `src/lib/pdf.server.ts` — pdf-lib renderer
- `src/lib/ai-gateway.server.ts` — Lovable AI provider helper

**Schema changes** (one migration)
- `purchases`: add `stripe_session_id`, `stripe_subscription_id`, `stripe_customer_id`, `amount_cents`, `currency`
- `protocols`: add `draft_content jsonb`, `pdf_url text`, `delivered_at timestamptz`; widen `status` enum if needed
- `intakes`: add `purchase_id uuid` link
- RLS already in place; tighten policies for new columns

**Edits**
- `src/routes/intake.tsx` — on submit, create purchase row + redirect to `/checkout?plan=X`
- `src/routes/checkout.tsx` — wire "Select" button → `createCheckoutSession`
- `src/routes/_authenticated.admin.tsx` — add "Generate draft" + "Send to client" UI
- `src/routes/_authenticated.dashboard.tsx` — show delivered protocols with download

**Secrets needed from you**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

`LOVABLE_API_KEY` is already provisioned for AI Gateway. Email infra is auto-managed once domain is set.

---

## Sequencing

1. Run DB migration (schema changes).
2. Trigger email domain setup dialog → wait for you to complete DNS.
3. Ask you for Stripe secrets + price IDs.
4. Build Stripe layer (server fn + webhook + checkout UI).
5. Set up email infra + scaffold templates + wire triggers.
6. Build AI draft + PDF renderer + admin/dashboard UI.
7. Test end-to-end with a Stripe test card.

This is one continuous build — I'll stop between (2) and (3) only because both need your input.