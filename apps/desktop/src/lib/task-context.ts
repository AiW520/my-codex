import type { SessionSummary } from "@pi-desktop/shared";

export type TaskContextStatus = "idle" | "running" | "permission" | "completed" | "failed";

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
