import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WorkbenchProfile } from "@pi-desktop/shared";
import {
  CUSTOM_MODULES,
  parseCustomDashboard,
  type CustomModuleId,
} from "../../lib/workbench-dashboard";
import { api } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { Panel, cx } from "../ui";
import { IconFileText, IconLink, IconListChecks, IconSliders } from "../icons";
import { NotesEditor, SourceListEditor, TaskListEditor } from "./WorkbenchModules";
import { WorkbenchPanelHeading } from "./WorkbenchSurfaceShell";
import { useWorkbenchDashboard } from "./useWorkbenchDashboard";

export function CustomWorkbenchHome({ workbench }: { workbench: WorkbenchProfile }) {
  const { t } = useTranslation();
  const dashboard = parseCustomDashboard(workbench.dashboardState);
  const save = useWorkbenchDashboard(workbench);
  const showToast = useAppStore((store) => store.showToast);
  const [notes, setNotes] = useState(dashboard.notes);

  const toggleModule = (module: CustomModuleId) => {
    const modules = dashboard.modules.includes(module)
      ? dashboard.modules.filter((item) => item !== module)
      : [...dashboard.modules, module];
    void save({ modules: modules.length > 0 ? modules : ["notes"] });
  };
  const openLink = (url: string) => {
    void api.browserOpenExternal(url).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    });
  };

  return (
    <section className="custom-workbench-home" aria-labelledby="custom-workbench-title">
      <div className="custom-workbench-heading">
        <div>
          <h2 id="custom-workbench-title">{t("workbench.custom.title")}</h2>
          <p>{t("workbench.custom.subtitle")}</p>
        </div>
        <div className="custom-workbench-module-picker" aria-label={t("workbench.custom.configureModules")}>
          <IconSliders size={14} aria-hidden />
          {CUSTOM_MODULES.map((module) => (
            <label className={cx(dashboard.modules.includes(module) && "is-selected")} key={module}>
              <input type="checkbox" checked={dashboard.modules.includes(module)} onChange={() => toggleModule(module)} />
              <span>{t(`workbench.custom.modules.${module}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="custom-workbench-modules">
        {dashboard.modules.includes("checklist") ? (
          <Panel className="workbench-panel custom-module custom-checklist-module">
            <WorkbenchPanelHeading icon={<IconListChecks size={16} />} title={t("workbench.custom.checklist")} description={t("workbench.custom.checklistHint")} />
            <TaskListEditor tasks={dashboard.tasks} onChange={(tasks) => void save({ tasks })} compact maxItems={100} />
          </Panel>
        ) : null}
        {dashboard.modules.includes("notes") ? (
          <Panel className="workbench-panel custom-module custom-notes-module">
            <WorkbenchPanelHeading icon={<IconFileText size={16} />} title={t("workbench.custom.notes")} description={t("workbench.custom.notesHint")} />
            <NotesEditor value={notes} onChange={setNotes} onCommit={() => void save({ notes })} placeholder={t("workbench.custom.notesPlaceholder")} label={t("workbench.custom.notes")} rows={5} />
          </Panel>
        ) : null}
        {dashboard.modules.includes("links") ? (
          <Panel className="workbench-panel custom-module custom-links-module">
            <WorkbenchPanelHeading icon={<IconLink size={16} />} title={t("workbench.custom.links")} description={t("workbench.custom.linksHint")} />
            <SourceListEditor sources={dashboard.links} onChange={(links) => void save({ links })} onOpen={openLink} compact maxItems={100} />
          </Panel>
        ) : null}
      </div>
    </section>
  );
}
