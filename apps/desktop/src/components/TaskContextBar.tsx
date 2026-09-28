import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/app-store";
import { PERMISSION_LABELS, TASK_STATUS_LABELS, taskContextProjectName, taskContextStatus, taskOutcomes, taskWorkspace } from "../lib/task-context";
import { IconBranch } from "./icons";

function Chip({ label, value }: { label: string; value: string }) {
  return <span className="task-context-chip" title={`${label}: ${value}`}>
    <span className="task-context-chip-label">{label}</span>
    <span className="task-context-chip-value">{value}</span>
  </span>;
}

export function TaskContextBar() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.sessions.find((item) => item.id === state.activeSessionId));
  const providers = useAppStore((state) => state.providers);
  const workspace = useAppStore((state) => state.workspace);
  const openProjects = useAppStore((state) => state.openProjects);
  const running = useAppStore((state) => Boolean(session && state.runningSessions[session.id]));
  const approval = useAppStore((state) => Boolean(session && (
    (state.pendingPermissions[session.id]?.length ?? 0) > 0 || state.planningStates[session.id] === "awaiting_approval"
  )));
  const notifications = useAppStore((state) => state.notifications);
  const latestTurnResults = useAppStore((state) => state.latestTurnResults);
  const defaultPermission = useAppStore((state) => state.settings?.defaultPermissionMode ?? "ask");
  const outcomes = useMemo(() => taskOutcomes(notifications, latestTurnResults), [notifications, latestTurnResults]);
  if (!session) return null;

  const owner = taskWorkspace(session, workspace ? [workspace, ...openProjects] : openProjects);
  const project = owner?.name ?? taskContextProjectName(session) ?? t("nav.hoverCardTemporarySpace");
  const provider = providers.find((item) => item.id === session.providerId);
  const status = taskContextStatus({ running, hasPendingPermission: approval, outcome: outcomes[session.id] });
  const permission = session.permissionMode === "inherit"
    ? `${t("chat.permissionInherit")} (${t(PERMISSION_LABELS[defaultPermission])})`
    : t(PERMISSION_LABELS[session.permissionMode]);

  return (
    <div className="task-context-bar" role="region" aria-label={t("taskContext.ariaLabel")}>
      <span className={`task-context-status is-${status}`} role="status">{t(TASK_STATUS_LABELS[status])}</span>
      <div className="task-context-details" tabIndex={0} role="group" aria-label={t("taskContext.ariaLabel")}>
        <Chip label={t("taskContext.project")} value={project} />
        {owner?.branch ? <span className="task-context-chip" title={t("nav.hoverCardBranchAria", { name: owner.branch })}>
          <IconBranch size={11} aria-hidden /><span className="task-context-chip-value">{owner.branch}</span>
        </span> : null}
        {session.providerId ? <Chip label={t("taskContext.provider")} value={provider?.name ?? session.providerId} /> : null}
        <Chip label={t("taskContext.model")} value={session.modelId ?? t("settings.noModel")} />
        <Chip label={t("taskContext.reasoning")} value={session.thinkingLevel} />
        <Chip label={t("taskContext.permission")} value={permission} />
      </div>
    </div>
  );
}
