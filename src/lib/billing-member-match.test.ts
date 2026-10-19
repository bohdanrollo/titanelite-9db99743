import { describe, expect, it } from "vitest";
import { matchBillingMember } from "./billing-member-match";

const members = [{ id: "member-1", email: "one@example.com" }, { id: "member-2", email: "two@example.com" }];
describe("Stripe billing member matching", () => {
  it("matches an exact normalized email", () => {
    expect(matchBillingMember(members, [], [], " ONE@example.com ")).toBe("member-1");
  });
  it("rejects ambiguous emails", () => {
    expect(matchBillingMember([...members, { id: "member-3", email: "one@example.com" }], [], [], "one@example.com")).toBeNull();
  });
  it("rejects conflicting metadata and stored customer ownership", () => {
    expect(matchBillingMember(members, ["member-1"], ["member-2"], "one@example.com")).toBeNull();
  });
  it("does not fall back from unknown metadata to another member", () => {
    expect(matchBillingMember(members, ["unknown"], [], "one@example.com")).toBeNull();
  });
  it("uses a verified customer binding before email", () => {
    expect(matchBillingMember(members, [], ["member-1"], "two@example.com")).toBe("member-1");
  });
});