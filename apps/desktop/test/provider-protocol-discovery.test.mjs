import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { detectProviderApiStyle, discoverProviderModelsWithProtocol } =
  await import("../electron/main/model-discovery.ts");

function response(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

test("protocol detection selects the operation route exposed by a gateway", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method });
    return response(String(url).endsWith("/chat/completions") ? 404 : 405);
  };
  try {
    const style = await detectProviderApiStyle({
      baseUrl: "https://gateway.example/v1",
      apiKey: "fixture-key",
      apiStyle: "chat_completions",
      apiStyleCandidates: ["responses", "chat_completions"],
    });
    assert.equal(style, "responses");
    assert.deepEqual(calls, [
      { url: "https://gateway.example/v1/chat/completions", method: "OPTIONS" },
      { url: "https://gateway.example/v1/responses", method: "OPTIONS" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("model discovery returns the detected style with the live model list", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method });
    if (init?.method === "OPTIONS") return response(String(url).endsWith("/responses") ? 204 : 404);
    return response(200, { data: [{ id: "fixture-model" }] });
  };
  try {
    const result = await discoverProviderModelsWithProtocol({
      baseUrl: "https://gateway.example/v1",
      apiKey: "fixture-key",
      apiStyle: "chat_completions",
      apiStyleCandidates: ["responses", "chat_completions"],
      autoDetectApiStyle: true,
    });
    assert.equal(result.apiStyle, "responses");
    assert.deepEqual(result.models, [{ modelId: "fixture-model", displayName: "fixture-model" }]);
    assert.equal(calls.at(-1)?.url, "https://gateway.example/v1/models");
    assert.equal(calls.at(-1)?.method, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
