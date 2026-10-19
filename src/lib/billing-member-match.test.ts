import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { matchBillingMember } from "./billing-member-match";

const members = [{ id: "member-1", email: "one@example.com" }, { id: "member-2", email: "two@example.com" }];
describe("Stripe billing member matching", () => {
  it("matches an exact normalized email", () => {
    assert.equal(matchBillingMember(members, [], [], " ONE@example.com "), "member-1");
  });
  it("rejects ambiguous emails", () => {
    assert.equal(matchBillingMember([...members, { id: "member-3", email: "one@example.com" }], [], [], "one@example.com"), null);
  });
  it("rejects conflicting metadata and stored customer ownership", () => {
    assert.equal(matchBillingMember(members, ["member-1"], ["member-2"], "one@example.com"), null);
  });
  it("does not fall back from unknown metadata to another member", () => {
    assert.equal(matchBillingMember(members, ["unknown"], [], "one@example.com"), null);
  });
  it("uses a verified customer binding before email", () => {
    assert.equal(matchBillingMember(members, [], ["member-1"], "two@example.com"), "member-1");
  });
});