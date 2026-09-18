import assert from "node:assert/strict";
import test from "node:test";
import { WorkbenchSelectionCoordinator } from "../src/lib/workbench-selection.ts";

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

test("rapid workbench selection commits only the latest intent", async () => {
  const firstActivation = deferred();
  const firstStarted = deferred();
  const activated = [];
  const committed = [];
  const coordinator = new WorkbenchSelectionCoordinator({
    currentContext: () => ({ workbenchId: "coding", projectPath: "/project", sessionId: "s1" }),
    rememberContext: async () => {},
    activate: async (id) => {
      activated.push(id);
      if (id === "daily") {
        firstStarted.resolve();
        await firstActivation.promise;
      }
      return id;
    },
    commit: (id) => committed.push(id),
  });

  const daily = coordinator.select("daily");
  await firstStarted.promise;
  const creative = coordinator.select("creative");
  const research = coordinator.select("research");
  firstActivation.resolve();

  assert.equal(await daily, false);
  assert.equal(await creative, false);
  assert.equal(await research, true);
  assert.deepEqual(activated, ["daily", "research"]);
  assert.deepEqual(committed, ["research"]);
});

test("selection remembers navigation before activating another workbench", async () => {
  const events = [];
  const coordinator = new WorkbenchSelectionCoordinator({
    currentContext: () => ({ workbenchId: "coding", projectPath: "/project", sessionId: "s1" }),
    rememberContext: async (context) => { events.push(["remember", context]); },
    activate: async (id) => { events.push(["activate", id]); return id; },
    commit: async (id) => { events.push(["commit", id]); },
  });
  assert.equal(await coordinator.select("daily"), true);
  assert.deepEqual(events.map(([event]) => event), ["remember", "activate", "commit"]);
  assert.deepEqual(events[0][1], { workbenchId: "coding", projectPath: "/project", sessionId: "s1" });
});
