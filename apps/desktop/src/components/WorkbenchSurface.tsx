import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { WorkbenchProfile, WorkbenchModelRole } from "@pi-desktop/shared";
import { useWorkbenchStore } from "../stores/workbench-store";
import { useAppStore } from "../stores/app-store";
import { api } from "../lib/api";
import { Badge, Button, Input, Panel, Select, Textarea } from "./ui";
import {
  IconCheck,
  IconCircleAlert,
  IconFileText,
  IconImage,
  IconLink,
  IconListChecks,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconSliders,
} from "./icons";

type DailyTask = { id: string; title: string; done: boolean };
type ResearchSource = { id: string; title: string; url: string };

function objectState(value: Record<string, unknown>): Record<string, unknown> {
  return value && typeof value === "object" ? value : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function templateTitle(template: WorkbenchProfile["templateId"], t: (key: string) => string) {
  return t(`workbench.templates.${template}`);
}

export function WorkbenchSurface({ workbench }: { workbench: WorkbenchProfile }) {
  switch (workbench.templateId) {
    case "daily":
      return <DailySurface key={workbench.id} workbench={workbench} />;
    case "creative":
      return <CreativeSurface key={workbench.id} workbench={workbench} />;
    case "research":
      return <ResearchSurface key={workbench.id} workbench={workbench} />;
    default:
      return null;
  }
}

function SurfaceHeader({ workbench, children }: { workbench: WorkbenchProfile; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <header className="workbench-surface-header">
      <div>
        <p className="workbench-surface-kicker">{t("workbench.workspaceLabel")}</p>
        <h1>{workbench.name}</h1>
        <p className="workbench-surface-description">
          {templateTitle(workbench.templateId, t)} · {t(`workbench.${workbench.templateId}.subtitle`)}
        </p>
      </div>
      {children ? <div className="workbench-surface-header-actions">{children}</div> : null}
    </header>
  );
}

function DailySurface({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const updateDashboard = useWorkbenchStore((store) => store.updateDashboard);
  const showToast = useAppStore((store) => store.showToast);
  const state = objectState(workbench.dashboardState);
  const tasks = Array.isArray(state.tasks)
    ? state.tasks.filter((task): task is DailyTask => {
        if (!task || typeof task !== "object") return false;
        const candidate = task as Record<string, unknown>;
        return typeof candidate.id === "string" && typeof candidate.title === "string";
      })
    : [];
  const [draftTask, setDraftTask] = useState("");
  const [notes, setNotes] = useState(stringValue(state.notes));

  const save = async (next: Record<string, unknown>) => {
    try {
      await updateDashboard(workbench.id, { ...state, ...next });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    }
  };
  const completed = tasks.filter((task) => task.done).length;

  return (
    <main className="workbench-surface workbench-surface-daily">
      <SurfaceHeader workbench={workbench}>
        <Badge tone="success">{t("workbench.daily.progress", { completed, total: tasks.length })}</Badge>
      </SurfaceHeader>
      <div className="workbench-surface-grid">
        <Panel className="workbench-panel workbench-task-panel">
          <div className="workbench-panel-heading">
            <div>
              <h2><IconListChecks size={17} /> {t("workbench.daily.tasks")}</h2>
              <p>{t("workbench.daily.tasksHint")}</p>
            </div>
          </div>
          <form className="workbench-inline-form" onSubmit={(event) => {
            event.preventDefault();
            const title = draftTask.trim();
            if (!title) return;
            void save({ tasks: [...tasks, { id: newId("task"), title, done: false }] });
            setDraftTask("");
          }}>
            <Input value={draftTask} onChange={(event) => setDraftTask(event.target.value)} placeholder={t("workbench.daily.taskPlaceholder")} aria-label={t("workbench.daily.taskPlaceholder")} />
            <Button type="submit" variant="primary" disabled={!draftTask.trim()}><IconPlus size={15} /> {t("workbench.daily.addTask")}</Button>
          </form>
          <div className="workbench-task-list" role="list">
            {tasks.length === 0 ? <p className="workbench-empty"><IconListChecks size={19} /> {t("workbench.daily.emptyTasks")}</p> : null}
            {tasks.map((task) => (
              <div className="workbench-task-row" key={task.id} role="listitem">
                <button type="button" className={`workbench-task-check${task.done ? " is-done" : ""}`} aria-label={task.done ? t("workbench.daily.markOpen") : t("workbench.daily.markDone")} onClick={() => void save({ tasks: tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item) })}>
                  {task.done ? <IconCheck size={14} /> : null}
                </button>
                <span className={task.done ? "is-done" : undefined}>{task.title}</span>
                <Button type="button" variant="ghost" className="workbench-row-delete" onClick={() => void save({ tasks: tasks.filter((item) => item.id !== task.id) })} aria-label={t("workbench.daily.deleteTask")}><IconTrash size={14} /></Button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="workbench-panel workbench-note-panel">
          <div className="workbench-panel-heading"><div><h2><IconFileText size={17} /> {t("workbench.daily.notes")}</h2><p>{t("workbench.daily.notesHint")}</p></div></div>
          <Textarea className="workbench-notes" value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => void save({ notes })} placeholder={t("workbench.daily.notesPlaceholder")} aria-label={t("workbench.daily.notes")} />
          <p className="workbench-save-hint">{t("workbench.savedLocally")}</p>
        </Panel>
      </div>
    </main>
  );
}

function CreativeSurface({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const updateWorkbench = useWorkbenchStore((store) => store.updateWorkbench);
  const showToast = useAppStore((store) => store.showToast);
  const providers = useAppStore((store) => store.providers);
  const state = objectState(workbench.dashboardState);
  const [prompt, setPrompt] = useState(stringValue(state.prompt));
  const models = useMemo(() => providers.flatMap((provider) => provider.models.map((model) => ({ id: `${provider.id}:${model.id}`, label: `${provider.name} · ${model.alias || model.id}`, providerId: provider.id, modelId: model.id }))), [providers]);
  const imageBinding = workbench.modelRoles.image;
  const videoBinding = workbench.modelRoles.video;

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

  const savePrompt = async () => {
    try {
      await updateWorkbench(workbench.id, { dashboardState: { ...state, prompt } });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    }
  };

  return (
    <main className="workbench-surface workbench-surface-creative">
      <SurfaceHeader workbench={workbench}><Badge tone="warning"><IconCircleAlert size={14} /> {t("workbench.creative.notConfigured")}</Badge></SurfaceHeader>
      <div className="workbench-surface-grid creative-grid">
        <Panel className="workbench-panel creative-prompt-panel">
          <div className="workbench-panel-heading"><div><h2><IconSparkles size={17} /> {t("workbench.creative.prompt")}</h2><p>{t("workbench.creative.promptHint")}</p></div></div>
          <Textarea className="creative-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onBlur={() => void savePrompt()} placeholder={t("workbench.creative.promptPlaceholder")} aria-label={t("workbench.creative.prompt")} />
          <div className="workbench-creative-actions"><Button type="button" variant="primary" disabled><IconSparkles size={15} /> {t("workbench.creative.generate")}</Button><span>{t("workbench.creative.configureToGenerate")}</span></div>
        </Panel>
        <Panel className="workbench-panel creative-settings-panel">
          <div className="workbench-panel-heading"><div><h2><IconSliders size={17} /> {t("workbench.creative.settings")}</h2><p>{t("workbench.creative.settingsHint")}</p></div></div>
          <label className="workbench-field"><span>{t("workbench.creative.imageModel")}</span><Select value={imageBinding ? `${imageBinding.providerId}:${imageBinding.modelId}` : ""} onChange={(event) => void setRole("image", event.target.value)}><option value="">{t("workbench.creative.unassigned")}</option>{models.map((model) => <option value={model.id} key={model.id}>{model.label}</option>)}</Select></label>
          <label className="workbench-field"><span>{t("workbench.creative.videoModel")}</span><Select value={videoBinding ? `${videoBinding.providerId}:${videoBinding.modelId}` : ""} onChange={(event) => void setRole("video", event.target.value)}><option value="">{t("workbench.creative.unassigned")}</option>{models.map((model) => <option value={model.id} key={model.id}>{model.label}</option>)}</Select></label>
          <p className="workbench-save-hint">{t("workbench.savedLocally")}</p>
        </Panel>
        <Panel className="workbench-panel creative-assets-panel">
          <div className="workbench-panel-heading"><div><h2><IconImage size={17} /> {t("workbench.creative.assets")}</h2><p>{t("workbench.creative.assetsHint")}</p></div></div>
          <div className="workbench-empty"><IconImage size={22} /><strong>{t("workbench.creative.emptyAssets")}</strong><span>{t("workbench.creative.emptyAssetsHint")}</span></div>
        </Panel>
      </div>
    </main>
  );
}

function ResearchSurface({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const updateDashboard = useWorkbenchStore((store) => store.updateDashboard);
  const showToast = useAppStore((store) => store.showToast);
  const state = objectState(workbench.dashboardState);
  const sources = Array.isArray(state.sources) ? state.sources.filter((source): source is ResearchSource => Boolean(source && typeof source === "object" && typeof (source as ResearchSource).id === "string" && typeof (source as ResearchSource).url === "string")) : [];
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState(stringValue(state.notes));
  const save = async (next: Record<string, unknown>) => {
    try { await updateDashboard(workbench.id, { ...state, ...next }); } catch (error) { showToast(error instanceof Error ? error.message : String(error), { variant: "error" }); }
  };

  return (
    <main className="workbench-surface workbench-surface-research">
      <SurfaceHeader workbench={workbench}><Badge>{t("workbench.research.localOnly")}</Badge></SurfaceHeader>
      <div className="workbench-surface-grid research-grid">
        <Panel className="workbench-panel research-sources-panel">
          <div className="workbench-panel-heading"><div><h2><IconLink size={17} /> {t("workbench.research.sources")}</h2><p>{t("workbench.research.sourcesHint")}</p></div></div>
          <form className="workbench-source-form" onSubmit={(event) => { event.preventDefault(); if (!url.trim()) return; void save({ sources: [...sources, { id: newId("source"), title: title.trim() || url.trim(), url: url.trim() }] }); setTitle(""); setUrl(""); }}><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("workbench.research.sourceTitle")} aria-label={t("workbench.research.sourceTitle")} /><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t("workbench.research.sourceUrl")} aria-label={t("workbench.research.sourceUrl")} /><Button type="submit" variant="primary" disabled={!url.trim()}><IconPlus size={15} /> {t("workbench.research.addSource")}</Button></form>
          <div className="workbench-source-list">{sources.length === 0 ? <p className="workbench-empty"><IconLink size={19} /> {t("workbench.research.emptySources")}</p> : sources.map((source) => <div className="workbench-source-row" key={source.id}><div><strong>{source.title}</strong><button type="button" className="workbench-source-link" onClick={() => void api.browserOpenExternal(source.url).catch((error) => showToast(error instanceof Error ? error.message : String(error), { variant: "error" }))}>{source.url}</button></div><Button type="button" variant="ghost" onClick={() => void save({ sources: sources.filter((item) => item.id !== source.id) })} aria-label={t("workbench.research.deleteSource")}><IconTrash size={14} /></Button></div>)}</div>
        </Panel>
        <Panel className="workbench-panel research-notes-panel"><div className="workbench-panel-heading"><div><h2><IconFileText size={17} /> {t("workbench.research.notes")}</h2><p>{t("workbench.research.notesHint")}</p></div></div><Textarea className="workbench-notes" value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => void save({ notes })} placeholder={t("workbench.research.notesPlaceholder")} aria-label={t("workbench.research.notes")} /><p className="workbench-save-hint">{t("workbench.savedLocally")}</p></Panel>
      </div>
    </main>
  );
}
