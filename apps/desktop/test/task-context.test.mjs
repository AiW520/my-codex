import assert from "node:assert/strict";
import test from "node:test";
import { matchesTaskFilter, taskContextProjectName, taskContextStatus, taskOutcomes, taskWorkspace } from "../src/lib/task-context.ts";

test("task context prioritizes approval over active execution", () => {
  assert.equal(
    taskContextStatus({ running: true, hasPendingPermission: true }),
    "permission",
  );
  assert.equal(taskContextStatus({ running: true, hasPendingPermission: false }), "running");
});

test("task context preserves terminal outcomes and falls back to idle", () => {
  assert.equal(taskContextStatus({ running: false, hasPendingPermission: false, outcome: "failed" }), "failed");
  assert.equal(taskContextStatus({ running: false, hasPendingPermission: false, outcome: "completed" }), "completed");
  assert.equal(taskContextStatus({ running: false, hasPendingPermission: false }), "idle");
});

test("task context derives a readable project name from a path", () => {
  assert.equal(taskContextProjectName({ projectPath: "/work/my-project" }), "my-project");
  assert.equal(taskContextProjectName({ projectPath: "C:\\work\\my-project" }), "my-project");
  assert.equal(taskContextProjectName({ projectPath: "" }), null);
});

test("terminal outcome survives notification read state and live results", () => {
  const outcomes = taskOutcomes([
    {
      id: "n1",
      kind: "task.completed",
      sessionId: "s1",
      sessionTitle: "Task",
      turnId: "t1",
      createdAt: new Date(1000).toISOString(),
      readAt: new Date(2000).toISOString(),
    },
  ], {});
  assert.equal(outcomes.s1, "completed");
  assert.equal(matchesTaskFilter("unread", "completed", true), true);
  assert.equal(matchesTaskFilter("unread", "completed", false), false);
});

test("latest terminal result wins regardless of notification order", () => {
  const notice = (kind, at) => ({ sessionId: "s", kind, createdAt: new Date(at).toISOString() });
  const notifications = [notice("task.completed", 1000), notice("task.failed", 2000)];
  assert.equal(taskOutcomes(notifications, {}).s, "failed");
  assert.equal(taskOutcomes(notifications, { s: { status: "completed", finishedAt: 3000 } }).s, "completed");
  assert.equal(taskOutcomes(notifications, { s: { status: "completed", finishedAt: 500 } }).s, "failed");
});

test("workspace context respects POSIX case and never borrows an unrelated branch", () => {
  const workspaces = [{ path: "/Repo", branch: "upper" }, { path: "/repo", branch: "lower" }];
  assert.equal(taskWorkspace({ projectPath: "/repo/" }, workspaces)?.branch, "lower");
  assert.equal(taskWorkspace({}, workspaces), undefined);
  assert.equal(taskWorkspace({ projectPath: "/other" }, workspaces), undefined);
  assert.equal(taskWorkspace({ projectPath: "C:\\Repo\\" }, [{ path: "c:/repo", branch: "windows" }])?.branch, "windows");
});
