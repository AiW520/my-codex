export type ProviderConnectionRequest = {
  url: string;
  init: RequestInit;
  verifiesCredential: boolean;
};

/** Build a provider probe without performing network I/O. */
export function providerConnectionRequest(input: {
  baseUrl: string;
  apiStyle?: string;
  modelId?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}): ProviderConnectionRequest {
  const base = input.baseUrl.trim().replace(/\/+$/, "");
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
        body: JSON.stringify({
          model: input.modelId,
          input: "ping",
          stream: false,
          max_output_tokens: 16,
          store: false,
        }),
      },
    };
  }
  return {
    url: `${base}/models`,
    verifiesCredential: false,
    init: { headers },
  };
}
