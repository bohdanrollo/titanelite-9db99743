import { test } from "node:test";
import { strict as assert } from "node:assert";
import { accountAccessTier, isPaidCheckoutPrice } from "./free-access";
test("an account receives Basic access without a purchase", () => { assert.equal(accountAccessTier(null, true), "basic"); });
test("a visitor receives no member access", () => { assert.equal(accountAccessTier(null, false), null); });
test("existing paid tiers retain their access", () => {
  for (const tier of ["basic", "limited", "full", "elite"] as const) assert.equal(accountAccessTier(tier, true), tier);
});
test("Basic cannot start a new paid checkout", () => {
  assert.equal(isPaidCheckoutPrice("basic_monthly"), false);
  assert.equal(isPaidCheckoutPrice("limited_monthly"), true);
  assert.equal(isPaidCheckoutPrice("elite_monthly"), true);
});