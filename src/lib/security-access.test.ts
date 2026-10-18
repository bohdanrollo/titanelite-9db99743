import { test } from "node:test";
import { strict as assert } from "node:assert";
import { paymentEnvironmentForKey, validatePaymentEnvironment } from "./payment-environment";
import { isPrivateFileRequest, secureResponse } from "./request-security";

test("live payments cannot be switched to sandbox by a caller", () => {
  assert.equal(paymentEnvironmentForKey("pk_live_example"), "live");
  assert.throws(() => validatePaymentEnvironment("sandbox", "live"));
  assert.doesNotThrow(() => validatePaymentEnvironment("live", "live"));
});
test("preview retains sandbox payments", () => {
  assert.equal(paymentEnvironmentForKey("pk_test_example"), "sandbox");
  assert.doesNotThrow(() => validatePaymentEnvironment("sandbox", "sandbox"));
  assert.throws(() => paymentEnvironmentForKey(undefined));
});
test("private files and source maps are denied without blocking public features", () => {
  for (const path of ["/.env", "/.env.production", "/.git/config", "/%2eenv", "/src/lib/email.server.ts", "/assets/app.js.map", "/package.json", "/drizzle/migrations/0000.sql"])
    assert.equal(isPrivateFileRequest(path), true, path);
  for (const path of ["/", "/dashboard", "/api/pep-talk", "/api/public/payments/webhook", "/.well-known/security.txt", "/assets/app.js", "/peptide-prices"])
    assert.equal(isPrivateFileRequest(path), false, path);
});
test("security headers preserve response contents and cookies", async () => {
  const response = secureResponse(new Response("ok", { headers: { "Set-Cookie": "example=value" } }));
  assert.equal(await response.text(), "ok");
  assert.equal(response.headers.get("Set-Cookie"), "example=value");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(secureResponse(new Response("denied", { status: 403 })).headers.get("Cache-Control"), "no-store");
});