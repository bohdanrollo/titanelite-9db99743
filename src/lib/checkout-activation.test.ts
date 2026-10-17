import { describe, expect, test } from "bun:test";
import { isCheckoutActivated } from "./checkout-activation";

describe("checkout activation", () => {
  test("$2.99 Basic purchase activates with Basic access", () => {
    expect(isCheckoutActivated("basic", "basic_monthly")).toBe(true);
  });
  test("a pending Basic purchase does not activate without access", () => {
    expect(isCheckoutActivated(null, "basic_monthly")).toBe(false);
    expect(isCheckoutActivated("unknown", "basic_monthly")).toBe(false);
  });
  test("existing Full access cannot confirm an Elite purchase early", () => {
    expect(isCheckoutActivated("full", "elite_monthly")).toBe(false);
    expect(isCheckoutActivated("elite", "elite_monthly")).toBe(true);
  });
  test("Limited and legacy Full purchases still activate", () => {
    expect(isCheckoutActivated("limited", "limited_monthly")).toBe(true);
    expect(isCheckoutActivated("full", "full_monthly")).toBe(true);
  });
  test("legacy return links retain their Limited minimum", () => {
    expect(isCheckoutActivated("basic")).toBe(false);
    expect(isCheckoutActivated("limited")).toBe(true);
  });
});