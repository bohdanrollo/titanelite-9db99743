/** One-off live billing backfill. Run with bun; credentials stay in the environment. */
import { createStripeClient } from "../src/lib/stripe.server";
import { supabaseAdmin as db } from "../src/integrations/supabase/client.server";
import { matchBillingMember, type BillingMember } from "../src/lib/billing-member-match";
import type { Json } from "../src/integrations/supabase/types";

const stripe = createStripeClient("live");
const members: BillingMember[] = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  members.push(...data.users.map((user) => ({ id: user.id, email: user.email ?? null })));
  if (data.users.length < 1000) break;
}

async function readAll(table: "user_access" | "purchases" | "profiles" | "marketing_subscribers") {
  const rows: unknown[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from(table).select("*").order("id").range(start, start + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const protectedTables = ["user_access", "purchases", "profiles", "marketing_subscribers"] as const;
const before = await Promise.all(protectedTables.map(readAll));
const bindingRows = [...before[0], ...before[1]] as { user_id: string; stripe_customer_id: string | null }[];
const subscriptions = [];
for await (const subscription of stripe.subscriptions.list({ status: "all", limit: 100 })) subscriptions.push(subscription);
const counts = { customers: 0, subscriptions: 0, invoices: 0, payments: 0, unmatchedCustomers: 0, matchedMembers: 0 };
const matched = new Set<string>();
const iso = (seconds: number | null | undefined) => seconds ? new Date(seconds * 1000).toISOString() : null;

async function store(userId: string, type: string, id: string, customerId: string, data: Json) {
  const { error } = await db.from("member_billing_records").upsert({
    user_id: userId, environment: "live", record_type: type, stripe_id: id,
    stripe_customer_id: customerId, billing_data: data, synced_at: new Date().toISOString(),
  }, { onConflict: "environment,record_type,stripe_id" });
  if (error) throw error;
}

for await (const customer of stripe.customers.list({ limit: 100 })) {
  const subs = subscriptions.filter((sub) => (typeof sub.customer === "string" ? sub.customer : sub.customer.id) === customer.id);
  const userId = matchBillingMember(members,
    [customer.metadata.userId, customer.metadata.user_id, ...subs.flatMap((sub) => [sub.metadata.userId, sub.metadata.user_id])],
    bindingRows.filter((row) => row.stripe_customer_id === customer.id).map((row) => row.user_id), customer.email);
  if (!userId) { counts.unmatchedCustomers++; continue; }
  matched.add(userId);
  await store(userId, "customer", customer.id, customer.id, {
    name: customer.name, email: customer.email, phone: customer.phone, currency: customer.currency ?? null,
    created_at: iso(customer.created), delinquent: customer.delinquent, balance: customer.balance,
  });
  counts.customers++;
  for (const sub of subs) {
    await store(userId, "subscription", sub.id, customer.id, {
      status: sub.status, created_at: iso(sub.created), canceled_at: iso(sub.canceled_at),
      cancel_at_period_end: sub.cancel_at_period_end, trial_end: iso(sub.trial_end), currency: sub.currency,
      items: sub.items.data.map((item) => ({
        price_id: item.price.id, lookup_key: item.price.lookup_key,
        unit_amount: item.price.unit_amount, currency: item.price.currency, quantity: item.quantity ?? 1,
        interval: item.price.recurring?.interval ?? null, interval_count: item.price.recurring?.interval_count ?? null,
        current_period_start: iso(item.current_period_start), current_period_end: iso(item.current_period_end),
      })),
    });
    counts.subscriptions++;
  }
  for await (const invoice of stripe.invoices.list({ customer: customer.id, limit: 100 })) {
    await store(userId, "invoice", invoice.id, customer.id, {
      status: invoice.status, currency: invoice.currency, amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due, amount_remaining: invoice.amount_remaining, total: invoice.total,
      subtotal: invoice.subtotal, created_at: iso(invoice.created), paid_at: iso(invoice.status_transitions.paid_at),
      number: invoice.number, subscription_id: invoice.parent?.subscription_details?.subscription ?? null,
      total_discounts: invoice.total_discount_amounts.map((discount) => ({ amount: discount.amount })),
    });
    counts.invoices++;
  }
  for await (const charge of stripe.charges.list({ customer: customer.id, limit: 100 })) {
    await store(userId, "payment", charge.id, customer.id, {
      status: charge.status, amount: charge.amount, amount_refunded: charge.amount_refunded,
      currency: charge.currency, paid: charge.paid, refunded: charge.refunded, disputed: charge.disputed,
      created_at: iso(charge.created), payment_intent_id: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null,
      failure_code: charge.failure_code,
    });
    counts.payments++;
  }
}
counts.matchedMembers = matched.size;
const after = await Promise.all(protectedTables.map(readAll));
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Protected member records changed during import; review concurrent activity.");
console.log(JSON.stringify({ ...counts, protectedMemberDataUnchanged: true }));