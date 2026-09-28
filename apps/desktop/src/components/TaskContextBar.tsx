import { useTranslation } from "react-i18next";
import type { ProviderPublic, ProjectWorkspace, SessionSummary } from "@pi-desktop/shared";
import { taskContextProjectName, taskContextStatus, type TaskContextStatus } from "../lib/task-context";
import { useAppStore } from "../stores/app-store";
import { IconBranch } from "./icons";

function statusLabel(t: (key: string, options?: Record<string, unknown>) => string, status: TaskContextStatus) {
  return t(`taskContext.status.${status}`, {
    defaultValue: {
      idle: "Ready",
      running: "Running",
      permission: "Needs approval",
      completed: "Completed",
      failed: "Failed",
    }[status],
  });
}

function modeLabel(t: (key: string, options?: Record<string, unknown>) => string, mode: SessionSummary["mode"]) {
  return t(`chat.mode${mode[0].toUpperCase()}${mode.slice(1)}`, {
    defaultValue: mode,
  });
}

function permissionLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  mode: SessionSummary["permissionMode"],
) {
  const labels: Record<string, string> = {
    inherit: "Default",
    ask: "Ask every time",
    acceptEdits: "Accept edits",
    auto: "Auto",
  };
  return t(`chat.permission${mode[0].toUpperCase()}${mode.slice(1)}`, {
    defaultValue: labels[mode] ?? mode,
  });
}

function Chip({ label, value, tone }: { label: string; value: string; tone?: TaskContextStatus }) {
  return (
    <span className={`task-context-chip${tone ? ` is-${tone}` : ""}`} title={`${label}: ${value}`}>
      <span className="task-context-chip-label">{label}</span>
      <span className="task-context-chip-value">{value}</span>
    </span>
  );
}

export function TaskContextBar({
  session,
  workspace,
  provider,
}: {
  session?: SessionSummary;
  workspace?: ProjectWorkspace | null;
  provider?: ProviderPublic;
}) {
  const { t } = useTranslation();
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const runningSessions = useAppStore((state) => state.runningSessions);
  const pendingPermissions = useAppStore((state) => state.pendingPermissions);
  const sessionOutcomes = useAppStore((state) => state.sessionOutcomes);
  if (!session) return null;

  const running = activeSessionId ? Boolean(runningSessions[activeSessionId]) : false;
  const hasPendingPermission = activeSessionId
    ? (pendingPermissions[activeSessionId]?.length ?? 0) > 0
    : false;
  const outcome = activeSessionId ? sessionOutcomes[activeSessionId] : undefined;
  const status = taskContextStatus({ running, hasPendingPermission, outcome });
  const project = taskContextProjectName(session) ?? workspace?.name ?? null;
  const branch = workspace?.branch;
  const model = session.modelId ?? provider?.models?.[0]?.id;

  return (
    <div className="task-context-bar" aria-label={t("taskContext.ariaLabel", { defaultValue: "Task context" })}>
      {project ? <Chip label={t("taskContext.project", { defaultValue: "Project" })} value={project} /> : null}
      {branch ? (
        <span className="task-context-chip task-context-branch" title={branch}>
          <IconBranch size={11} aria-hidden />
          <span className="task-context-chip-value">{branch}</span>
        </span>
      ) : null}
      {provider ? <Chip label={t("taskContext.provider", { defaultValue: "Provider" })} value={provider.name} /> : null}
      {model ? <Chip label={t("taskContext.model", { defaultValue: "Model" })} value={model} /> : null}
      <Chip
        label={t("taskContext.reasoning", { defaultValue: "Reasoning" })}
        value={session.thinkingLevel}
      />
      <Chip
        label={t("taskContext.permission", { defaultValue: "Permission" })}
        value={permissionLabel(t, session.permissionMode)}
      />
      <Chip
        label={modeLabel(t, session.mode)}
        value={statusLabel(t, status)}
        tone={status}
      />
    </div>
  );
}
