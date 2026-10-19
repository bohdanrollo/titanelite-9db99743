import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { signupSchema, friendlyErrorMessage } from "./signup-schema";

const valid = { name: "Test Member", email: "member@example.com", password: "test-password-only", phone: "+1 317 555 0123", marketingConsent: true, age21: true, researchUse: true };
describe("account contact and consent requirements", () => {
  test("requires an email address", () => { assert.equal(signupSchema.safeParse({ ...valid, email: "" }).success, false); });
  test("requires a phone number with country code", () => {
    assert.equal(signupSchema.safeParse({ ...valid, phone: "" }).success, false);
    assert.equal(signupSchema.safeParse({ ...valid, phone: "3175550123" }).success, false);
    assert.equal(signupSchema.parse(valid).phone, "+13175550123");
  });
  test("requires explicit email and SMS consent", () => { assert.equal(signupSchema.safeParse({ ...valid, marketingConsent: false }).success, false); });
  test("still requires age and research confirmations", () => {
    assert.equal(signupSchema.safeParse({ ...valid, age21: false }).success, false);
    assert.equal(signupSchema.safeParse({ ...valid, researchUse: false }).success, false);
  });
  test("shows a clear message instead of raw JSON for a bad phone number", () => {
    const result = signupSchema.safeParse({ ...valid, phone: "317-555-0123" });
    assert.equal(result.success, false);
    if (result.success) return;
    const message = friendlyErrorMessage(result.error);
    assert.equal(message, "Enter a phone number with country code, such as +1 317 555 0123.");
    assert.equal(message.includes("["), false);
  });
});