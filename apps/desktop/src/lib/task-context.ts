import type { AppNotification, PermissionMode, ProjectWorkspace, SessionSummary } from "@pi-desktop/shared";

function normalizeProjectPath(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replaceAll("\\", "/").replace(/\/+$/, "") || "/";
  // Windows drive/UNC paths are case-insensitive; POSIX roots need exact casing.
  return /^[a-z]:\//i.test(normalized) || normalized.startsWith("//")
    ? normalized.toLowerCase() : normalized;
}

export type TaskContextStatus = "idle" | "running" | "permission" | "completed" | "failed";
export type TaskStatusFilter = "all" | "unread" | Exclude<TaskContextStatus, "idle">;

export const TASK_STATUS_LABELS: Record<TaskContextStatus, string> = {
  idle: "taskContext.status.idle",
  running: "taskContext.status.running",
  permission: "taskContext.status.permission",
  completed: "taskContext.status.completed",
  failed: "taskContext.status.failed",
};

export const PERMISSION_LABELS: Record<PermissionMode, string> = {
  inherit: "chat.permissionInherit",
  ask: "chat.permissionAsk",
  "accept-edits": "chat.permissionAcceptEdits",
  auto: "chat.permissionAuto",
};

/** Results describe the last known turn; reading a notification only clears its unread badge. */
export function taskOutcomes(
  notifications: readonly AppNotification[],
  live: Record<string, { status: "completed" | "failed"; finishedAt: number }>,
): Record<string, "completed" | "failed"> {
  const latest = new Map<string, { status: "completed" | "failed"; at: number }>();
  for (const notice of notifications) {
    const at = Date.parse(notice.createdAt);
    if (!Number.isFinite(at) || at <= (latest.get(notice.sessionId)?.at ?? -Infinity)) continue;
    latest.set(notice.sessionId, { status: notice.kind === "task.failed" ? "failed" : "completed", at });
  }
  for (const [id, result] of Object.entries(live)) {
    if (result.finishedAt >= (latest.get(id)?.at ?? -Infinity)) {
      latest.set(id, { status: result.status, at: result.finishedAt });
    }
  }
  return Object.fromEntries([...latest].map(([id, result]) => [id, result.status]));
}

export function matchesTaskFilter(filter: TaskStatusFilter, status: TaskContextStatus, unread: boolean): boolean {
  return filter === "all" || (filter === "unread" ? unread : filter === status);
}

/** Never attach another project's cached branch to a temporary or switching task. */
export function taskWorkspace(session: SessionSummary, workspaces: readonly ProjectWorkspace[]): ProjectWorkspace | undefined {
  const path = normalizeProjectPath(session.projectPath);
  return path ? workspaces.find((workspace) => normalizeProjectPath(workspace.path) === path) : undefined;
}

export function taskContextStatus({
  running,
  hasPendingPermission,
  outcome,
}: {
  running: boolean;
  hasPendingPermission: boolean;
  outcome?: "completed" | "failed";
}): TaskContextStatus {
  if (hasPendingPermission) return "permission";
  if (running) return "running";
  return outcome ?? "idle";
}

export function taskContextProjectName(session?: Pick<SessionSummary, "projectPath"> | null): string | null {
  const path = session?.projectPath?.trim();
  if (!path) return null;
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? path;
}
