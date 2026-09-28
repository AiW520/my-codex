import assert from "node:assert/strict";
import test from "node:test";
import { taskContextProjectName, taskContextStatus } from "../src/lib/task-context.ts";

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
