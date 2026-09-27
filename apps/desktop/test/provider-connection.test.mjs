import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { providerConnectionRequest } = await import(
  "../electron/main/provider-connection.ts",
);

test("Responses verification uses a minimal authenticated generation request", () => {
  const request = providerConnectionRequest({
    baseUrl: "https://api.example.test/v1/",
    apiStyle: "responses",
    modelId: "gpt-test",
    apiKey: "sk-test",
    headers: { "X-Gateway": "fixture" },
  });

  assert.equal(request.url, "https://api.example.test/v1/responses");
  assert.equal(request.verifiesCredential, true);
  assert.deepEqual(request.init.headers, {
    Authorization: "Bearer sk-test",
    "X-Gateway": "fixture",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(request.init.body), {
    model: "gpt-test",
    input: "ping",
    stream: false,
    max_output_tokens: 16,
    store: false,
  });
});

test("non-Responses providers retain the non-generating model-list probe", () => {
  const request = providerConnectionRequest({
    baseUrl: "https://api.example.test/v1",
    apiStyle: "chat_completions",
    apiKey: "sk-test",
  });

  assert.equal(request.url, "https://api.example.test/v1/models");
  assert.equal(request.verifiesCredential, false);
  assert.equal(request.init.method, undefined);
  assert.deepEqual(request.init.headers, { Authorization: "Bearer sk-test" });
  assert.equal(request.init.body, undefined);
});

test("Responses verification requires a configured model", () => {
  assert.throws(
    () => providerConnectionRequest({
      baseUrl: "https://api.example.test/v1",
      apiStyle: "responses",
      apiKey: "sk-test",
    }),
    /No model is configured/,
  );
});
