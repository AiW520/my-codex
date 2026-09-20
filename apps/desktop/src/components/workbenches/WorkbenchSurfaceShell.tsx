import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { WorkbenchProfile } from "@pi-desktop/shared";

export function WorkbenchSurfaceHeader({
  workbench,
  children,
}: {
  workbench: WorkbenchProfile;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <header className="workbench-surface-header">
      <div>
        <p className="workbench-surface-kicker">{t("workbench.workspaceLabel")}</p>
        <h1>{workbench.name}</h1>
        <p className="workbench-surface-description">
          {t(`workbench.templates.${workbench.templateId}`)} · {t(`workbench.${workbench.templateId}.subtitle`)}
        </p>
      </div>
      {children ? <div className="workbench-surface-header-actions">{children}</div> : null}
    </header>
  );
}

export function WorkbenchPanelHeading({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="workbench-panel-heading">
      <div>
        <h2>{icon} {title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="workbench-panel-actions">{actions}</div> : null}
    </div>
  );
}
