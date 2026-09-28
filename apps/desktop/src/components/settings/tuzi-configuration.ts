import { NAMED_ENDPOINT_PRESETS, normalizeEndpointUrl, type ProviderPublic } from "@pi-desktop/shared";

export const TUZI_PRESETS = NAMED_ENDPOINT_PRESETS.filter((preset) => preset.product === "tuzi");

/** Match the configured endpoint, not a potentially stale vendor label. */
export function tuziProviders(providers: readonly ProviderPublic[], baseUrl: string): ProviderPublic[] {
  return providers.filter((provider) => normalizeEndpointUrl(provider.baseUrl) === normalizeEndpointUrl(baseUrl));
}

export type ConnectionNotice = { key: string; tone: "success" | "warning" | "error"; params?: Record<string, string | number> };

export function connectionNotice(value: unknown): ConnectionNotice {
  if (!value || typeof value !== "object") return { key: "settings.testFailed", tone: "error" };
  const result = value as { ok?: boolean; status?: number; credential?: string; errorCode?: string; code?: string };
  if (result.ok) return result.credential === "verified"
    ? { key: "settings.testOk", tone: "success" }
    : { key: "settings.testEndpointOnly", tone: "warning" };
  if (result.status === 401 || result.status === 403 || result.credential === "invalid") {
    return { key: "errors.PROVIDER_UNAUTHORIZED", tone: "error" };
  }
  if (result.status === 429) return { key: "errors.PROVIDER_RATE_LIMITED", tone: "warning" };
  const code = result.errorCode ?? result.code;
  if (["MODEL_NOT_CONFIGURED", "TIMEOUT", "NETWORK_ERROR", "PROVIDER_UNAUTHORIZED", "PROVIDER_RATE_LIMITED"].includes(code ?? "")) {
    return { key: `errors.${code}`, tone: code === "PROVIDER_RATE_LIMITED" ? "warning" : "error" };
  }
  return typeof result.status === "number"
    ? { key: "settings.testFailedStatus", params: { status: result.status }, tone: "error" }
    : { key: "settings.testFailed", tone: "error" };
}
