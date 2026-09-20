import { useTranslation } from "react-i18next";
import { summarizeWorkbench } from "../lib/workbench-dashboard";
import { useWorkbenchStore } from "../stores/workbench-store";
import { cx } from "./ui";
import { WorkbenchIcon } from "./WorkbenchIcon";

export function WorkbenchLauncher() {
  const { t } = useTranslation();
  const state = useWorkbenchStore((store) => store.state);
  const switchingId = useWorkbenchStore((store) => store.switchingId);

  if (!state || state.workbenches.length < 2) return null;

  return (
    <section className="workbench-launcher" aria-labelledby="workbench-launcher-title">
      <div className="workbench-launcher-heading">
        <h2 id="workbench-launcher-title">{t("workbench.launcherTitle")}</h2>
        <span>{t("workbench.launcherHint")}</span>
      </div>
      <div className="workbench-launcher-list">
        {state.workbenches.map((workbench) => {
          const active = workbench.id === state.activeWorkbenchId;
          const switching = workbench.id === switchingId;
          const summary = summarizeWorkbench(workbench);
          return (
            <button
              type="button"
              key={workbench.id}
              className={cx(
                "workbench-launcher-item",
                `is-${workbench.templateId}`,
                active && "is-active",
                switching && "is-switching",
              )}
              aria-current={active ? "page" : undefined}
              disabled={active || Boolean(switchingId)}
              onClick={() => void useWorkbenchStore.getState().selectWorkbench(workbench.id)}
            >
              <span className="workbench-launcher-icon" aria-hidden>
                <WorkbenchIcon profile={workbench} size={17} />
              </span>
              <span className="workbench-launcher-copy">
                <strong>{workbench.name}</strong>
                <small>{t(`workbench.templates.${workbench.templateId}`)}</small>
                <span className="workbench-launcher-summary">
                  {t(`workbench.launcherSummary.${summary.kind}`, {
                    primary: summary.primary,
                    secondary: summary.secondary,
                  })}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
