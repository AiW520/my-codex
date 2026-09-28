import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NamedEndpointPreset, ProviderPublic } from "@pi-desktop/shared";
import { api } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { Badge, Button } from "../ui";
import { IconExternal } from "../icons";
import { connectionNotice, TUZI_PRESETS, tuziProviders, type ConnectionNotice } from "./tuzi-configuration";
import { describeModelsFetchError } from "./model-fetch-error";

type Props = {
  onConfigure: (presetId: string, provider?: ProviderPublic) => void;
  onMakeDefault: (provider: ProviderPublic) => Promise<void>;
  busyId: string | null;
};

function TuziRow({ preset, provider, onConfigure, onMakeDefault, busyId }: Props & {
  preset: NamedEndpointPreset;
  provider?: ProviderPublic;
}) {
  const { t } = useTranslation();
  const defaultId = useAppStore((state) => state.settings?.defaultProviderId);
  const defaultModelId = useAppStore((state) => state.settings?.defaultModelId);
  const discoveredModels = useAppStore((state) => provider ? state.providerModels[provider.id] : undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ConnectionNotice | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const disabled = busy || busyId === provider?.id;
  const ready = Boolean(provider?.enabled && provider.hasSecret && provider.models.length);
  const protocol = provider?.apiStyle ?? preset.apiStyle;
  const model = provider?.id === defaultId ? defaultModelId : provider?.models[0]?.id;

  const run = async (action: "test" | "models") => {
    if (!provider || locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice(null);
    try {
      if (action === "test") {
        const result = await api.testProvider(provider.id);
        if (mounted.current) setNotice(connectionNotice(result));
      } else {
        const result = await api.listProviderModels({ providerId: provider.id, source: "refresh" });
        if (!mounted.current) return;
        // Discovery may return a catalog/fallback with an error; neither proves credentials.
        if (result.error) {
          const view = describeModelsFetchError(result.error);
          setNotice({ key: view.summaryKey, params: view.summaryParams, tone: "warning" });
        } else {
          setNotice({
            key: result.source === "remote" ? "settings.tuziModelsUpdated" : result.source === "catalog"
              ? "settings.modelsFromCatalogNote" : "settings.modelsFallbackNote",
            tone: result.source === "remote" ? "success" : "warning",
          });
        }
        // Update only discovery cache. Do not overwrite chosen model bindings or secrets.
        if (!result.error) {
          useAppStore.setState((state) => ({
            providerModels: { ...state.providerModels, [provider.id]: result.models },
          }));
        }
      }
    } catch (error) {
      if (mounted.current) {
        if (action === "test") setNotice(connectionNotice(error));
        else {
          const view = describeModelsFetchError(error instanceof Error ? error.message : undefined);
          setNotice({ key: view.summaryKey, params: view.summaryParams, tone: "error" });
        }
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <article className="tuzi-config-row" data-tuzi-preset={preset.id} data-provider-id={provider?.id}>
    <div className="tuzi-config-row-copy">
      <div className="tuzi-config-row-title">
        <span>{provider?.name ?? t(preset.labelKey)}</span>
        <Badge tone={provider?.hasSecret ? "success" : "warning"}>{t(provider?.hasSecret ? "settings.tuziConfigured" : "settings.tuziNeedsKey")}</Badge>
        {provider && !provider.enabled ? <Badge tone="neutral">{t("settings.providerDisabledBadge")}</Badge> : null}
        {provider?.id === defaultId ? <Badge tone="success">{t("settings.default")}</Badge> : null}
      </div>
      <div className="tuzi-config-row-meta">
        <span className="font-mono">{provider?.baseUrl ?? preset.baseUrl}</span>
        <span>{protocol === "responses" ? t("settings.apiStyleResponses") : protocol}</span>
        <span>{t("settings.providerModelCount", { count: discoveredModels?.length ?? provider?.models.length ?? 0 })}</span>
      </div>
      <div className="tuzi-config-row-meta">{t("settings.defaultModel")}: {model ?? t("settings.noModel")}</div>
      <div className="tuzi-config-row-meta" role="status">
        {notice ? <Badge tone={notice.tone}>{t(notice.key, notice.params ?? {})}</Badge>
          : provider?.hasSecret ? t("settings.modelsUnverifiedNote") : null}
      </div>
    </div>
    <div className="tuzi-config-row-actions">
      <Button size="sm" variant="ghost" disabled={disabled || Boolean(provider?.ownerPluginId)}
        onClick={() => onConfigure(preset.id, provider)}>
        {t(provider ? "settings.editProvider" : "settings.addProvider")}
      </Button>
      {provider ? <>
        {defaultId !== provider.id ? <Button size="sm" variant="ghost" disabled={disabled || !ready}
          onClick={() => void onMakeDefault(provider)}>{t("settings.makeDefault")}</Button> : null}
        <Button size="sm" variant="ghost" disabled={disabled || !provider.hasSecret}
          onClick={() => void run("models")}>{t("settings.tuziRefreshModels")}</Button>
        <Button size="sm" variant="ghost" disabled={disabled || !ready}
          onClick={() => void run("test")}>{busy ? t("common.loading") : t("settings.testConnection")}</Button>
      </> : null}
      {preset.website ? <a className="tuzi-config-link" href={preset.website} target="_blank" rel="noreferrer">
        {t("settings.tuziOpenPortal")}<IconExternal size={12} />
      </a> : null}
    </div>
  </article>;
}

export function TuziConfigurationCard(props: Props) {
  const { t } = useTranslation();
  const providers = useAppStore((state) => state.providers);
  return <section className="settings-card-block tuzi-config-card">
    <div className="model-config-section-head">
      <div>
        <h3 className="settings-card-heading">{t("settings.tuziTitle")}</h3>
        <p className="tuzi-config-subtitle">{t("settings.tuziDescription")}</p>
      </div>
    </div>
    <div className="tuzi-config-grid">
      {TUZI_PRESETS.flatMap((preset) => {
        const configured = tuziProviders(providers, preset.baseUrl);
        return configured.length ? configured.map((provider) =>
          <TuziRow key={`${provider.id}:${provider.updatedAt}`} preset={preset} provider={provider} {...props} />
        ) : [<TuziRow key={preset.id} preset={preset} {...props} />];
      })}
    </div>
    <div className="tuzi-config-footer">{t("settings.tuziUsageHint")}</div>
  </section>;
}
