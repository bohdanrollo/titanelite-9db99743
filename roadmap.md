# Roadmap

## Stripe member billing import
- [x] Import matching live Stripe customer, subscription, invoice, and payment records without changing access, prices, or consent
- [x] Verify imported counts, two unmatched customers, and duplicate-free repeat import

## Security hardening
- [x] Review private source exposure and privileged API authorization; preserve existing admins
- [x] Add private-file blocking, security headers, payment-environment isolation, admin-only email sending, subscriber ownership checks, and coaching field protections
- [x] Verify anonymous denial and signed-in dashboard; regression tests pass; coaching integration tests remain unavailable with restricted test connection

## Home page plans and buttons
- [x] Show Free Basic, Limited $10.99/month, and Elite $250/month on the home page
- [x] Verify home page buttons, header menus, and footer links; fix Explore click behavior; verify signed-in plan links and mobile layout

## Peptide-stack phone notifications
- [ ] Replace stack reminder emails with phone push notifications — blocked: Firebase notification connection was declined; delivery approach needs user decision

## Free Basic accounts
- [x] Make Basic access free for accounts while preserving higher-tier access and existing Basic billing
- [x] Require email, phone, and recorded email/SMS consent across signup forms
- [x] Update pricing and verify signup/access rules (13 tests; signup reached free dashboard and PepHub)

## Current monitoring fixes
- [x] Correct Basic payment confirmation and test tier activation
- [x] Verify deprecated model replacements and migrate only affected calls; do not publish

## PepHub Price Comparison
- [x] Phase 1: vendor tracking toggle, auto sync (Shopify/Woo/feed/AI), compound matching, member search + comparison pages, admin Inventory tab
- [x] Phase 2: compound mapping admin, price history view, price drops, click/search analytics, product detail stats

## Welcome page refresh
- [x] Replace phone image and apply a scoped pale-blue welcome page theme
- [x] Verify desktop and phone presentation and existing buttons; keep unpublished
- [x] Verify the corrected hero image (blue outline removed) renders cleanly on the welcome page — no deploy
- [x] Add Peptide Calculator button to top header

## Dashboard redesign (phased, per uploaded brief)
- [x] Phase 1: dashboard home, bottom/side navigation, design system
- [ ] Phase 2+: redesign each dashboard tool page

## Giveaway
- [x] Replace the golf cart prize with a Rolex GMT-Master "Batman" giveaway; entry rules unchanged
- [x] Admin dashboard rebuilt (overview, members, traffic, plans from Stripe, site banner, team, settings, activity)
