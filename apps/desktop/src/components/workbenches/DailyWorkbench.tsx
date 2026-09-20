import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WorkbenchProfile } from "@pi-desktop/shared";
import { dailyProgress, parseDailyDashboard } from "../../lib/workbench-dashboard";
import { Badge, Input, Panel } from "../ui";
import { IconCalendar, IconCheckCheck, IconClock, IconFileText, IconListChecks, IconTarget } from "../icons";
import { NotesEditor, TaskListEditor, WorkbenchMetric } from "./WorkbenchModules";
import { WorkbenchPanelHeading, WorkbenchSurfaceHeader } from "./WorkbenchSurfaceShell";
import { useWorkbenchDashboard } from "./useWorkbenchDashboard";

export function DailyWorkbench({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const dashboard = parseDailyDashboard(workbench.dashboardState);
  const progress = dailyProgress(dashboard.tasks);
  const save = useWorkbenchDashboard(workbench);
  const [focus, setFocus] = useState(dashboard.focus);
  const [notes, setNotes] = useState(dashboard.notes);

  return (
    <main className="workbench-surface workbench-surface-daily">
      <WorkbenchSurfaceHeader workbench={workbench}>
        <Badge tone={progress.open === 0 && dashboard.tasks.length > 0 ? "success" : "neutral"}>
          <IconCalendar size={14} /> {t("workbench.daily.progress", { completed: progress.completed, total: dashboard.tasks.length })}
        </Badge>
      </WorkbenchSurfaceHeader>

      <section className="workbench-metric-rail" aria-label={t("workbench.daily.overview")}>
        <WorkbenchMetric icon={<IconClock size={17} />} label={t("workbench.daily.openTasks")} value={progress.open} />
        <WorkbenchMetric icon={<IconTarget size={17} />} label={t("workbench.daily.highPriority")} value={progress.highPriorityOpen} />
        <WorkbenchMetric icon={<IconCheckCheck size={17} />} label={t("workbench.daily.completion")} value={`${progress.percent}%`} />
        <div className="workbench-progress" aria-label={t("workbench.daily.completion")} aria-valuenow={progress.percent} role="progressbar">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      </section>

      <div className="workbench-surface-grid daily-grid">
        <Panel className="workbench-panel workbench-task-panel">
          <WorkbenchPanelHeading
            icon={<IconListChecks size={17} />}
            title={t("workbench.daily.tasks")}
            description={t("workbench.daily.tasksHint")}
          />
          <TaskListEditor tasks={dashboard.tasks} onChange={(tasks) => void save({ tasks })} />
        </Panel>

        <div className="workbench-side-stack">
          <Panel className="workbench-panel workbench-focus-panel">
            <WorkbenchPanelHeading
              icon={<IconTarget size={17} />}
              title={t("workbench.daily.focus")}
              description={t("workbench.daily.focusHint")}
            />
            <Input
              value={focus}
              maxLength={500}
              onChange={(event) => setFocus(event.target.value)}
              onBlur={() => void save({ focus })}
              placeholder={t("workbench.daily.focusPlaceholder")}
              aria-label={t("workbench.daily.focus")}
            />
          </Panel>
          <Panel className="workbench-panel workbench-note-panel">
            <WorkbenchPanelHeading
              icon={<IconFileText size={17} />}
              title={t("workbench.daily.notes")}
              description={t("workbench.daily.notesHint")}
            />
            <NotesEditor
              value={notes}
              onChange={setNotes}
              onCommit={() => void save({ notes })}
              placeholder={t("workbench.daily.notesPlaceholder")}
              label={t("workbench.daily.notes")}
              rows={10}
            />
          </Panel>
        </div>
      </div>
    </main>
  );
}
