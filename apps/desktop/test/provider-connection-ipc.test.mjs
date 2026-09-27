import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { ErrorCodes } from "../../../packages/shared/src/errors.ts";
import { IPC } from "../../../packages/shared/src/protocol.ts";

function load(relative, imports) {
  const file = new URL(relative, import.meta.url);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: file.pathname,
  });
  const module = { exports: {} };
  new Function("require", "exports", "module", outputText)(
    (id) => {
      assert.ok(Object.hasOwn(imports, id), `unexpected provider IPC dependency: ${id}`);
      return imports[id];
    },
    module.exports,
    module,
  );
  return module.exports;
}

const providerConnectionRequest = (input) => {
  const base = input.baseUrl.replace(/\/+$/, "");
  const headers = {
    ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
    ...(input.headers ?? {}),
  };
  if (input.apiStyle === "responses") {
    if (!input.modelId) throw new Error("No model is configured for Responses verification");
    return {
      url: `${base}/responses`,
      verifiesCredential: true,
      init: {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ model: input.modelId, input: "ping", stream: false, max_output_tokens: 16, store: false }),
      },
    };
  }
  return { url: `${base}/models`, verifiesCredential: false, init: { headers } };
};

const { registerProviderIpc } = load("../electron/main/ipc/provider-ipc.ts", {
  "@pi-desktop/shared": { IPC, ErrorCodes, resolveBindingContextWindow() {} },
  "../oauth": { OAUTH_AUTH_KIND: "oauth" },
  "../model-discovery": { discoverProviderModelsWithProtocol() {} },
  "../provider-connection": { providerConnectionRequest },
  "@pi-desktop/agent-runtime": {
    genericModelConfig() {}, modelConfigWithBinding() {}, mergeProviderHeaders: (base, extra) => ({ ...base, ...(extra ?? {}) }),
  },
  "../models-dev-catalog": {},
});

function harness(provider, response) {
  const handlers = new Map();
  const calls = [];
  const host = {
    async call(method) {
      calls.push(method);
      if (method === "providers.testConnection") return { ok: true };
      if (method === "providers.get") return { provider };
      if (method === "providers.getSecret") return { value: "sk-fixture" };
      throw new Error(`unexpected host call: ${method}`);
    },
  };
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  registerProviderIpc({
    registrar: { handle: (channel, handler) => handlers.set(channel, handler) },
    getHost: () => host,
    modelsDevCatalog: {
      refresh: async () => false, ensureLoaded: async () => {}, loadLocal: async () => {},
      getStatus: () => ({}), findModel: () => undefined, modelsForProvider: () => [],
    },
    vendorOAuth: { resolveAuth: async () => {}, listVendors: async () => [], listModels: async () => [] },
    logger: { app() {} }, enrichProvider: (value) => value,
    listRuntimeProviders: async () => [], enrichProviderList: async (value) => value,
    bindingForModel: () => undefined,
  });
  return {
    calls,
    test: () => handlers.get(IPC.invoke.providersTest)("provider-1"),
    restore: () => { globalThis.fetch = previousFetch; },
  };
}

test("IPC Responses test marks a successful minimal generation as verified", async () => {
  const fixture = harness({ id: "provider-1", baseUrl: "https://gateway.test/v1", apiStyle: "responses", defaultModelId: "model-a" }, { ok: true, status: 200 });
  try {
    assert.deepEqual(await fixture.test(), { ok: true, network: "ok", credential: "verified", status: 200 });
    const request = fixture.calls.find((call) => typeof call === "object");
    assert.equal(request.url, "https://gateway.test/v1/responses");
    assert.equal(request.init.method, "POST");
    assert.equal(JSON.parse(request.init.body).model, "model-a");
  } finally {
    fixture.restore();
  }
});

test("IPC Responses test maps authentication failure to invalid credential", async () => {
  const fixture = harness({ id: "provider-1", baseUrl: "https://gateway.test/v1", apiStyle: "responses", models: [{ id: "model-a" }] }, { ok: false, status: 401 });
  try {
    assert.deepEqual(await fixture.test(), {
      ok: false, network: "failed", credential: "invalid", status: 401,
      errorCode: ErrorCodes.PROVIDER_UNAUTHORIZED,
    });
  } finally {
    fixture.restore();
  }
});

test("IPC model-list probe stays reachable but unverified for non-Responses providers", async () => {
  const fixture = harness({ id: "provider-1", baseUrl: "https://gateway.test/v1", apiStyle: "chat_completions" }, { ok: true, status: 200 });
  try {
    assert.deepEqual(await fixture.test(), { ok: true, network: "ok", credential: "unverified", status: 200 });
    const request = fixture.calls.find((call) => typeof call === "object");
    assert.equal(request.url, "https://gateway.test/v1/models");
    assert.equal(request.init.method, undefined);
  } finally {
    fixture.restore();
  }
});

test("IPC Responses test skips credential verification when no model is configured", async () => {
  const fixture = harness({ id: "provider-1", baseUrl: "https://gateway.test/v1", apiStyle: "responses" }, { ok: true, status: 200 });
  try {
    assert.deepEqual(await fixture.test(), {
      ok: false, network: "skipped", credential: "unverified",
      errorCode: ErrorCodes.MODEL_NOT_CONFIGURED,
      message: "No model is configured for Responses verification",
    });
    assert.equal(fixture.calls.some((call) => typeof call === "object"), false);
  } finally {
    fixture.restore();
  }
});
