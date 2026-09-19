import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMED_ENDPOINT_PRESETS, type ModelBinding, type ProviderPublic } from "@pi-desktop/shared";
import { api } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { Button, portalOverlay } from "../ui";
import { IconArrowUpRight, IconGlobe, IconKey, IconServer, IconSparkles } from "../icons";
import { ProviderSetupDialog } from "./ProviderSetupDialog";

type ProductPreset = (typeof NAMED_ENDPOINT_PRESETS)[number];

/**
 * Small first-run chooser for the Tuzi products. It deliberately hands the
 * credential step to ProviderSetupDialog so API keys use the normal Host
 * secret store and model discovery path.
 */
export function ProductOnboardingDialog() {
  const { t } = useTranslation();
  const onboarding = useAppStore((state) => state.onboarding);
  const providers = useAppStore((state) => state.providers);
  const refreshProviders = useAppStore((state) => state.refreshProviders);
  const [setupServiceId, setSetupServiceId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const products = useMemo(
    () => NAMED_ENDPOINT_PRESETS.filter((preset) => preset.product === "tuzi"),
    [],
  );

  if (!onboarding?.showChecklist || providers.length > 0 || closing) return null;

  const dismiss = async () => {
    setClosing(true);
    try {
      await api.dismissOnboarding();
    } finally {
      const current = useAppStore.getState().onboarding;
      if (current) {
        useAppStore.setState({ onboarding: { ...current, showChecklist: false } });
      }
    }
  };

  const saved = async (_provider: ProviderPublic, _models: ModelBinding[]) => {
    setSetupServiceId(null);
    await dismiss();
    await refreshProviders();
  };

  if (setupServiceId) {
    return (
      <ProviderSetupDialog
        key={setupServiceId}
        initialServiceId={setupServiceId}
        onClose={() => setSetupServiceId(null)}
        onSaved={(provider, models) => void saved(provider, models)}
      />
    );
  }

  return portalOverlay(
    <div className="overlay tuzi-product-overlay" role="presentation">
      <div
        className="dialog tuzi-product-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tuzi-product-title"
      >
        <div className="tuzi-product-hero">
          <div className="tuzi-product-mark" aria-hidden>
            <IconSparkles size={18} />
          </div>
          <div>
            <p className="tuzi-product-eyebrow">{t("settings.tuziOnboardingEyebrow")}</p>
            <h2 id="tuzi-product-title">{t("settings.tuziOnboardingTitle")}</h2>
            <p className="tuzi-product-subtitle">{t("settings.tuziOnboardingSubtitle")}</p>
          </div>
        </div>

        <div className="tuzi-product-grid">
          {products.map((preset, index) => (
            <ProductCard
              key={preset.id}
              preset={preset}
              index={index}
              onChoose={() => setSetupServiceId(preset.id)}
            />
          ))}
        </div>

        <div className="tuzi-product-footer">
          <span className="tuzi-product-security">
            <IconKey size={14} />
            {t("settings.tuziOnboardingSecurity")}
          </span>
          <div className="tuzi-product-actions">
            <Button variant="ghost" size="sm" onClick={() => void dismiss()}>
              {t("settings.tuziOnboardingLater")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setSetupServiceId("custom")}>
              <IconServer size={14} />
              {t("settings.tuziOnboardingOther")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
  );
}

function ProductCard({
  preset,
  index,
  onChoose,
}: {
  preset: ProductPreset;
  index: number;
  onChoose: () => void;
}) {
  const { t } = useTranslation();
  const label = t(preset.labelKey);
  const description = t(
    index === 0
      ? "settings.tuziProductApiDescription"
      : index === 1
        ? "settings.tuziProductCodexDescription"
        : "settings.tuziProductGacDescription",
  );
  return (
    <button type="button" className="tuzi-product-card" onClick={onChoose}>
      <span className="tuzi-product-card-top">
        <span className="tuzi-product-icon" aria-hidden>
          {index === 0 ? <IconGlobe size={17} /> : <IconServer size={17} />}
        </span>
        <span className="tuzi-product-card-arrow" aria-hidden><IconArrowUpRight size={14} /></span>
      </span>
      <span className="tuzi-product-card-name">{label}</span>
      <span className="tuzi-product-card-description">{description}</span>
      <span className="tuzi-product-card-endpoint">{preset.baseUrl}</span>
    </button>
  );
}
