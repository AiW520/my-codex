import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WorkbenchModelRole, WorkbenchProfile } from "@pi-desktop/shared";
import {
  newWorkbenchItemId,
  parseCreativeDashboard,
  type CreativeBrief,
  type CreativeOutputType,
} from "../../lib/workbench-dashboard";
import { useAppStore } from "../../stores/app-store";
import { useWorkbenchStore } from "../../stores/workbench-store";
import { Badge, Button, Input, Panel, Select, Textarea } from "../ui";
import {
  IconCircleAlert,
  IconClipboard,
  IconFileText,
  IconImage,
  IconSliders,
  IconSparkles,
  IconTrash,
  IconVideo,
} from "../icons";
import { SegmentedControl, WorkbenchMetric } from "./WorkbenchModules";
import { WorkbenchPanelHeading, WorkbenchSurfaceHeader } from "./WorkbenchSurfaceShell";
import { useWorkbenchDashboard } from "./useWorkbenchDashboard";

export function CreativeWorkbench({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const dashboard = parseCreativeDashboard(workbench.dashboardState);
  const save = useWorkbenchDashboard(workbench);
  const updateWorkbench = useWorkbenchStore((store) => store.updateWorkbench);
  const showToast = useAppStore((store) => store.showToast);
  const providers = useAppStore((store) => store.providers);
  const models = useMemo(
    () => providers.flatMap((provider) => provider.models.map((model) => ({
      id: `${provider.id}:${model.id}`,
      label: `${provider.name} · ${model.alias || model.id}`,
      providerId: provider.id,
      modelId: model.id,
    }))),
    [providers],
  );
  const [title, setTitle] = useState(dashboard.title);
  const [prompt, setPrompt] = useState(dashboard.prompt);
  const [negativePrompt, setNegativePrompt] = useState(dashboard.negativePrompt);
  const [outputType, setOutputType] = useState<CreativeOutputType>(dashboard.outputType);
  const [aspectRatio, setAspectRatio] = useState(dashboard.aspectRatio);

  const persistEditor = () => void save({ title, prompt, negativePrompt, outputType, aspectRatio });
  const setRole = async (role: WorkbenchModelRole, value: string) => {
    const selected = models.find((model) => model.id === value);
    const modelRoles = { ...workbench.modelRoles };
    if (selected) modelRoles[role] = { providerId: selected.providerId, modelId: selected.modelId };
    else delete modelRoles[role];
    try {
      await updateWorkbench(workbench.id, { modelRoles });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    }
  };
  const saveBrief = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    const brief: CreativeBrief = {
      id: newWorkbenchItemId("brief"),
      title: title.trim() || trimmedPrompt.slice(0, 80),
      prompt: trimmedPrompt,
      negativePrompt: negativePrompt.trim(),
      outputType,
      aspectRatio,
      createdAt: Date.now(),
    };
    void save({ title, prompt, negativePrompt, outputType, aspectRatio, briefs: [brief, ...dashboard.briefs] });
  };
  const loadBrief = (brief: CreativeBrief) => {
    setTitle(brief.title);
    setPrompt(brief.prompt);
    setNegativePrompt(brief.negativePrompt);
    setOutputType(brief.outputType);
    setAspectRatio(brief.aspectRatio);
  };

  return (
    <main className="workbench-surface workbench-surface-creative">
      <WorkbenchSurfaceHeader workbench={workbench}>
        <Badge tone="warning"><IconCircleAlert size={14} /> {t("workbench.creative.notConfigured")}</Badge>
      </WorkbenchSurfaceHeader>

      <section className="workbench-metric-rail" aria-label={t("workbench.creative.overview")}>
        <WorkbenchMetric icon={<IconClipboard size={17} />} label={t("workbench.creative.savedBriefs")} value={dashboard.briefs.length} />
        <WorkbenchMetric icon={<IconImage size={17} />} label={t("workbench.creative.imageBinding")} value={workbench.modelRoles.image ? t("workbench.creative.bound") : t("workbench.creative.unassigned")} />
        <WorkbenchMetric icon={<IconVideo size={17} />} label={t("workbench.creative.videoBinding")} value={workbench.modelRoles.video ? t("workbench.creative.bound") : t("workbench.creative.unassigned")} />
      </section>

      <div className="workbench-surface-grid creative-grid">
        <Panel className="workbench-panel creative-prompt-panel">
          <WorkbenchPanelHeading
            icon={<IconSparkles size={17} />}
            title={t("workbench.creative.brief")}
            description={t("workbench.creative.briefHint")}
            actions={(
              <SegmentedControl
                label={t("workbench.creative.outputType")}
                value={outputType}
                onChange={setOutputType}
                options={[
                  { value: "image", label: t("workbench.creative.image") },
                  { value: "video", label: t("workbench.creative.video") },
                ]}
              />
            )}
          />
          <div className="creative-brief-fields">
            <label className="workbench-field">
              <span>{t("workbench.creative.briefTitle")}</span>
              <Input value={title} maxLength={240} onChange={(event) => setTitle(event.target.value)} onBlur={persistEditor} placeholder={t("workbench.creative.briefTitlePlaceholder")} />
            </label>
            <label className="workbench-field">
              <span>{t("workbench.creative.prompt")}</span>
              <Textarea className="creative-prompt" value={prompt} maxLength={8_000} onChange={(event) => setPrompt(event.target.value)} onBlur={persistEditor} placeholder={t("workbench.creative.promptPlaceholder")} />
            </label>
            <div className="creative-brief-row">
              <label className="workbench-field">
                <span>{t("workbench.creative.negativePrompt")}</span>
                <Input value={negativePrompt} maxLength={4_000} onChange={(event) => setNegativePrompt(event.target.value)} onBlur={persistEditor} placeholder={t("workbench.creative.negativePromptPlaceholder")} />
              </label>
              <label className="workbench-field">
                <span>{t("workbench.creative.aspectRatio")}</span>
                <Select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} onBlur={persistEditor}>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </Select>
              </label>
            </div>
          </div>
          <div className="workbench-creative-actions">
            <Button type="button" variant="secondary" onClick={saveBrief} disabled={!prompt.trim()}>
              <IconFileText size={15} /> {t("workbench.creative.saveBrief")}
            </Button>
            <Button type="button" variant="primary" disabled>
              <IconSparkles size={15} /> {t("workbench.creative.generate")}
            </Button>
            <span>{t("workbench.creative.configureToGenerate")}</span>
          </div>
        </Panel>

        <div className="workbench-side-stack">
          <Panel className="workbench-panel creative-settings-panel">
            <WorkbenchPanelHeading icon={<IconSliders size={17} />} title={t("workbench.creative.settings")} description={t("workbench.creative.settingsHint")} />
            <ModelBinding
              label={t("workbench.creative.imageModel")}
              value={workbench.modelRoles.image ? `${workbench.modelRoles.image.providerId}:${workbench.modelRoles.image.modelId}` : ""}
              models={models}
              onChange={(value) => void setRole("image", value)}
            />
            <ModelBinding
              label={t("workbench.creative.videoModel")}
              value={workbench.modelRoles.video ? `${workbench.modelRoles.video.providerId}:${workbench.modelRoles.video.modelId}` : ""}
              models={models}
              onChange={(value) => void setRole("video", value)}
            />
          </Panel>
          <Panel className="workbench-panel creative-runtime-panel">
            <WorkbenchPanelHeading icon={<IconCircleAlert size={17} />} title={t("workbench.creative.runtime") } description={t("workbench.creative.runtimeHint")} />
            <p className="workbench-runtime-state"><span /> {t("workbench.creative.notConfigured")}</p>
          </Panel>
        </div>

        <Panel className="workbench-panel creative-briefs-panel">
          <WorkbenchPanelHeading icon={<IconClipboard size={17} />} title={t("workbench.creative.briefQueue")} description={t("workbench.creative.briefQueueHint")} />
          {dashboard.briefs.length === 0 ? (
            <div className="workbench-empty"><IconClipboard size={21} /><strong>{t("workbench.creative.emptyBriefs")}</strong><span>{t("workbench.creative.emptyBriefsHint")}</span></div>
          ) : (
            <div className="creative-brief-list" role="list">
              {dashboard.briefs.map((brief) => (
                <div className="creative-brief-row-item" role="listitem" key={brief.id}>
                  <button type="button" className="creative-brief-open" onClick={() => loadBrief(brief)}>
                    {brief.outputType === "image" ? <IconImage size={16} /> : <IconVideo size={16} />}
                    <span><strong>{brief.title}</strong><small>{brief.aspectRatio} · {t("workbench.creative.draft")}</small></span>
                  </button>
                  <Button type="button" variant="ghost" className="workbench-row-delete" aria-label={t("workbench.creative.deleteBrief")} onClick={() => void save({ briefs: dashboard.briefs.filter((item) => item.id !== brief.id) })}>
                    <IconTrash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}

function ModelBinding({
  label,
  value,
  models,
  onChange,
}: {
  label: string;
  value: string;
  models: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="workbench-field">
      <span>{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("workbench.creative.unassigned")}</option>
        {models.map((model) => <option value={model.id} key={model.id}>{model.label}</option>)}
      </Select>
    </label>
  );
}
