import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const profile = (templateId, dashboardState = {}, extra = {}) => ({
  id: templateId,
  name: templateId,
  templateId,
  icon: templateId,
  position: 0,
  motionEnabled: true,
  motionIntensity: 70,
  wallpaperOpacity: 20,
  layoutPreset: "default",
  modelRoles: {},
  dashboardState,
  projectPaths: [],
  sessionIds: [],
  dataVersion: 1,
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

test("workbench dashboard parsing is bounded, compatible, and truthful", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const dashboard = await server.ssrLoadModule("/src/lib/workbench-dashboard.ts");

    assert.deepEqual(
      dashboard.parseDailyDashboard({ tasks: [{ id: "old", title: "Legacy task", done: false }] }).tasks,
      [{ id: "old", title: "Legacy task", done: false, priority: "medium", bucket: "today" }],
    );
    assert.equal(dashboard.safeResearchUrl("javascript:alert(1)"), null);
    assert.equal(dashboard.safeResearchUrl("file:///secret.txt"), null);
    assert.equal(dashboard.safeResearchUrl("https:example.com"), null);
    assert.equal(dashboard.safeResearchUrl("https://example.com/a"), "https://example.com/a");

    const creative = dashboard.parseCreativeDashboard({
      briefs: [{ id: "brief-1", prompt: "A real saved prompt", outputType: "image" }],
      assets: [{ id: "fake-result" }],
    });
    assert.equal(creative.briefs.length, 1);
    assert.equal("assets" in creative, false);

    assert.deepEqual(dashboard.parseCustomDashboard({}).modules, ["checklist", "notes"]);
    assert.deepEqual(dashboard.parseCustomDashboard({ modules: ["links", "unknown"] }).modules, ["links"]);

    assert.deepEqual(dashboard.summarizeWorkbench(profile("daily", {
      tasks: [
        { id: "1", title: "Open", done: false },
        { id: "2", title: "Done", done: true },
      ],
    })), { kind: "daily", primary: 1, secondary: 1 });
    assert.deepEqual(dashboard.summarizeWorkbench(profile("coding", {}, {
      projectPaths: ["C:/one", "C:/two"],
      sessionIds: ["session-1"],
    })), { kind: "coding", primary: 2, secondary: 1 });
    assert.deepEqual(dashboard.summarizeWorkbench(profile("research", {
      sources: [
        { id: "1", title: "One", url: "https://example.com", status: "reviewed" },
        { id: "2", title: "Two", url: "https://example.org", status: "reading" },
      ],
    })), { kind: "research", primary: 2, secondary: 1 });
  } finally {
    await server.close();
  }
});
