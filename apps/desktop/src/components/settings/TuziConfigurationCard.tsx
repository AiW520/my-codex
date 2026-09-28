import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMED_ENDPOINT_PRESETS, type ProviderPublic } from "@pi-desktop/shared";
import { api } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { Badge, Button } from "../ui";
import { IconCheck, IconExternal, IconPlug, IconReview } from "../icons";

const TUZI_PRESETS = NAMED_ENDPOINT_PRESETS.filter((preset) => preset.product === "tuzi");

function matchingProvider(providers: ProviderPublic[], vendorKey: string) {
  return providers.find((provider) => provider.vendorKey === vendorKey);
}

export function TuziConfigurationCard() {
  const { t } = useTranslation();
  const providers = useAppStore((state) => state.providers);
  const refreshProviders = useAppStore((state) => state.refreshProviders);
  const showToast = useAppStore((state) => state.showToast);
  const [busy, setBusy] = useState<string | null>(null);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const configuredCount = useMemo(
    () => TUZI_PRESETS.filter((preset) => matchingProvider(providers, preset.vendorKey)).length,
    [providers],
  );

  const test = async (provider: ProviderPublic) => {
    setBusy(provider.id);
    try {
      const result = (await api.testProvider(provider.id)) as {
        ok?: boolean;
        credential?: "verified" | "invalid" | "unverified";
        network?: string;
      };
      showToast(
        result.ok
          ? result.credential === "unverified"
            ? t("settings.tuziEndpointOnly", { defaultValue: "Endpoint reachable; credential was not verified." })
            : t("settings.testOk")
          : t("settings.tuziCredentialInvalid", { defaultValue: "Tuzi credential is invalid." }),
        { variant: result.ok ? (result.credential === "unverified" ? "warning" : "success") : "error" },
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  const refreshModels = async (provider: ProviderPublic) => {
    setBusy(`${provider.id}:models`);
    try {
      const result = await api.listProviderModels({ providerId: provider.id, source: "refresh" });
      setModelCounts((current) => ({ ...current, [provider.id]: result.models.length }));
      await refreshProviders();
      showToast(t("settings.tuziModelsUpdated", { defaultValue: "Tuzi model list updated." }), { variant: "success" });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="settings-card-block tuzi-config-card">
      <div className="model-config-section-head">
        <div>
          <div className="settings-card-heading-line">
            <h3 className="settings-card-heading">{t("settings.tuziTitle", { defaultValue: "Tuzi / GAC configuration" })}</h3>
            <Badge tone={configuredCount > 0 ? "success" : "neutral"}>
              {configuredCount}/{TUZI_PRESETS.length}
            </Badge>
          </div>
          <p className="tuzi-config-subtitle">
            {t("settings.tuziDescription", { defaultValue: "Responses endpoints, API key status, model discovery, and usage links in one place." })}
          </p>
        </div>
        <span className="tuzi-protocol-badge"><IconCheck size={12} /> Responses</span>
      </div>
      <div className="tuzi-config-grid">
        {TUZI_PRESETS.map((preset) => {
          const provider = matchingProvider(providers, preset.vendorKey);
          const count = provider ? modelCounts[provider.id] ?? provider.models.length : 0;
          const rowBusy = provider ? busy === provider.id || busy === `${provider.id}:models` : false;
          return (
            <article className="tuzi-config-row" key={preset.id}>
              <div className="tuzi-config-row-copy">
                <div className="tuzi-config-row-title">
                  <span>{preset.name}</span>
                  <Badge tone={provider?.hasSecret ? "success" : "warning"}>
                    {provider?.hasSecret
                      ? t("settings.tuziConfigured", { defaultValue: "Configured" })
                      : t("settings.tuziNeedsKey", { defaultValue: "Needs API key" })}
                  </Badge>
                </div>
                <div className="tuzi-config-row-meta">
                  <span className="font-mono">{preset.baseUrl}</span>
                  <span>·</span>
                  <span>{t("settings.providerModelCount", { count })}</span>
                </div>
              </div>
              <div className="tuzi-config-row-actions">
                {provider ? (
                  <>
                    <Button size="sm" variant="ghost" disabled={rowBusy} onClick={() => void refreshModels(provider)}>
                      <IconReview size={13} />
                      {t("settings.tuziRefreshModels", { defaultValue: "Refresh models" })}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={rowBusy} onClick={() => void test(provider)}>
                      <IconPlug size={13} />
                      {t("settings.testConnection")}
                    </Button>
                  </>
                ) : null}
                {preset.website ? (
                  <a className="tuzi-config-link" href={preset.website} target="_blank" rel="noreferrer">
                    {t("settings.tuziOpenPortal", { defaultValue: "Portal" })}
                    <IconExternal size={12} />
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <div className="tuzi-config-footer">
        {t("settings.tuziUsageHint", { defaultValue: "Usage and limits are associated with the API key issued by Tuzi/GAC." })}
      </div>
    </section>
  );
}
