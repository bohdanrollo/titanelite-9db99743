import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { isCheckoutActivated } from "./checkout-activation";

describe("checkout activation", () => {
  test("$2.99 Basic purchase activates with Basic access", () => {
    assert.equal(isCheckoutActivated("basic", "basic_monthly"), true);
  });
  test("a pending Basic purchase does not activate without access", () => {
    assert.equal(isCheckoutActivated(null, "basic_monthly"), false);
    assert.equal(isCheckoutActivated("unknown", "basic_monthly"), false);
  });
  test("existing Full access cannot confirm an Elite purchase early", () => {
    assert.equal(isCheckoutActivated("full", "elite_monthly"), false);
    assert.equal(isCheckoutActivated("elite", "elite_monthly"), true);
  });
  test("Limited and legacy Full purchases still activate", () => {
    assert.equal(isCheckoutActivated("limited", "limited_monthly"), true);
    assert.equal(isCheckoutActivated("full", "full_monthly"), true);
  });
  test("legacy return links retain their Limited minimum", () => {
    assert.equal(isCheckoutActivated("basic"), false);
    assert.equal(isCheckoutActivated("limited"), true);
  });
});