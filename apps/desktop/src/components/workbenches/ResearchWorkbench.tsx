import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WorkbenchProfile } from "@pi-desktop/shared";
import { parseResearchDashboard, researchProgress } from "../../lib/workbench-dashboard";
import { api } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { Badge, Input, Panel } from "../ui";
import { IconBookOpen, IconCheckCheck, IconClock, IconFileText, IconLink, IconTarget } from "../icons";
import { NotesEditor, SourceListEditor, WorkbenchMetric } from "./WorkbenchModules";
import { WorkbenchPanelHeading, WorkbenchSurfaceHeader } from "./WorkbenchSurfaceShell";
import { useWorkbenchDashboard } from "./useWorkbenchDashboard";

export function ResearchWorkbench({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const dashboard = parseResearchDashboard(workbench.dashboardState);
  const progress = researchProgress(dashboard.sources);
  const save = useWorkbenchDashboard(workbench);
  const showToast = useAppStore((store) => store.showToast);
  const [question, setQuestion] = useState(dashboard.question);
  const [notes, setNotes] = useState(dashboard.notes);
  const [conclusion, setConclusion] = useState(dashboard.conclusion);

  const openSource = (url: string) => {
    void api.browserOpenExternal(url).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    });
  };

  return (
    <main className="workbench-surface workbench-surface-research">
      <WorkbenchSurfaceHeader workbench={workbench}>
        <Badge tone={progress.reviewed > 0 && progress.reviewed === dashboard.sources.length ? "success" : "neutral"}>
          <IconBookOpen size={14} /> {t("workbench.research.progress", { reviewed: progress.reviewed, total: dashboard.sources.length })}
        </Badge>
      </WorkbenchSurfaceHeader>

      <section className="workbench-metric-rail" aria-label={t("workbench.research.overview")}>
        <WorkbenchMetric icon={<IconLink size={17} />} label={t("workbench.research.sourceCount")} value={dashboard.sources.length} />
        <WorkbenchMetric icon={<IconClock size={17} />} label={t("workbench.research.readingCount")} value={progress.reading} />
        <WorkbenchMetric icon={<IconCheckCheck size={17} />} label={t("workbench.research.reviewedCount")} value={progress.reviewed} />
        <div className="workbench-progress" aria-label={t("workbench.research.reviewedCount")} aria-valuenow={progress.percent} role="progressbar">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      </section>

      <div className="workbench-surface-grid research-grid">
        <Panel className="workbench-panel research-sources-panel">
          <WorkbenchPanelHeading icon={<IconLink size={17} />} title={t("workbench.research.sources")} description={t("workbench.research.sourcesHint")} />
          <SourceListEditor sources={dashboard.sources} onChange={(sources) => void save({ sources })} onOpen={openSource} />
        </Panel>

        <div className="workbench-side-stack">
          <Panel className="workbench-panel research-question-panel">
            <WorkbenchPanelHeading icon={<IconTarget size={17} />} title={t("workbench.research.question")} description={t("workbench.research.questionHint")} />
            <Input value={question} maxLength={1_000} onChange={(event) => setQuestion(event.target.value)} onBlur={() => void save({ question })} placeholder={t("workbench.research.questionPlaceholder")} aria-label={t("workbench.research.question")} />
          </Panel>
          <Panel className="workbench-panel research-notes-panel">
            <WorkbenchPanelHeading icon={<IconFileText size={17} />} title={t("workbench.research.notes")} description={t("workbench.research.notesHint")} />
            <NotesEditor value={notes} onChange={setNotes} onCommit={() => void save({ notes })} placeholder={t("workbench.research.notesPlaceholder")} label={t("workbench.research.notes")} rows={7} />
          </Panel>
          <Panel className="workbench-panel research-conclusion-panel">
            <WorkbenchPanelHeading icon={<IconBookOpen size={17} />} title={t("workbench.research.conclusion")} description={t("workbench.research.conclusionHint")} />
            <NotesEditor value={conclusion} onChange={setConclusion} onCommit={() => void save({ conclusion })} placeholder={t("workbench.research.conclusionPlaceholder")} label={t("workbench.research.conclusion")} rows={5} />
          </Panel>
        </div>
      </div>
    </main>
  );
}
