import assert from "node:assert/strict";
import test from "node:test";
import { connectionNotice, tuziProviders } from "../src/components/settings/tuzi-configuration.ts";

test("Tuzi matches endpoints rather than stale provider vendor labels", () => {
  const providers = [
    { id: "configured", vendorKey: "custom", baseUrl: "https://api.tu-zi.com/v1/" },
    { id: "stale", vendorKey: "tuzi-api", baseUrl: "https://other.example/v1" },
  ];
  assert.deepEqual(tuziProviders(providers, "https://api.tu-zi.com/v1").map((item) => item.id), ["configured"]);
});

test("connection notices distinguish verified credentials from endpoint reachability", () => {
  assert.equal(connectionNotice({ ok: true, credential: "verified" }).tone, "success");
  assert.equal(connectionNotice({ ok: true, credential: "unverified" }).key, "settings.testEndpointOnly");
  assert.equal(connectionNotice({ ok: true }).tone, "warning");
});

test("connection notices classify failures without showing remote response bodies", () => {
  for (const [value, key] of [
    [{ status: 401 }, "errors.PROVIDER_UNAUTHORIZED"],
    [{ status: 403 }, "errors.PROVIDER_UNAUTHORIZED"],
    [{ status: 429 }, "errors.PROVIDER_RATE_LIMITED"],
    [{ errorCode: "MODEL_NOT_CONFIGURED" }, "errors.MODEL_NOT_CONFIGURED"],
    [{ code: "TIMEOUT" }, "errors.TIMEOUT"],
    [{ code: "NETWORK_ERROR" }, "errors.NETWORK_ERROR"],
    [null, "settings.testFailed"],
  ]) assert.equal(connectionNotice(value).key, key);
  assert.deepEqual(connectionNotice({ status: 503, message: "sensitive body" }), {
    key: "settings.testFailedStatus", tone: "error", params: { status: 503 },
  });
});
