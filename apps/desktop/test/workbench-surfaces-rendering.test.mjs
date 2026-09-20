import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import { catalogs } from "@pi-desktop/i18n";
import { createServer } from "vite";

const profile = (id, templateId, dashboardState, modelRoles = {}) => ({
  id,
  name: `${templateId} space`,
  templateId,
  icon: templateId,
  position: 0,
  motionEnabled: true,
  motionIntensity: 70,
  wallpaperOpacity: 20,
  layoutPreset: "default",
  modelRoles,
  dashboardState,
  projectPaths: [],
  sessionIds: [],
  dataVersion: 1,
  createdAt: 1,
  updatedAt: 1,
});

test("workbench surfaces render their key persisted and honest states", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    esbuild: { jsx: "automatic" },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { WorkbenchSurface } = await server.ssrLoadModule("/src/components/WorkbenchSurface.tsx");
    const { CustomWorkbenchHome } = await server.ssrLoadModule("/src/components/workbenches/CustomWorkbenchHome.tsx");
    await i18n.init({ lng: "en", resources: { en: { translation: catalogs.en } } });
    const render = (component, props) => renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(component, props)),
    );

    const daily = render(WorkbenchSurface, { workbench: profile("daily-a", "daily", {
      focus: "Ship the workbench",
      tasks: [{ id: "task", title: "Verify task flow", done: false, priority: "high", bucket: "today" }],
      notes: "Daily context",
    }) });
    assert.match(daily, /Ship the workbench/);
    assert.match(daily, /Verify task flow/);
    assert.match(daily, /High priority/);

    const creative = render(WorkbenchSurface, { workbench: profile("creative-a", "creative", {
      title: "Launch visual",
      prompt: "Product on a clean desk",
      briefs: [{ id: "brief", title: "Saved launch", prompt: "Saved prompt", outputType: "image", aspectRatio: "16:9", createdAt: 1 }],
    }) });
    assert.match(creative, /Launch visual/);
    assert.match(creative, /Saved launch/);
    assert.match(creative, /Media runtime not configured/);
    assert.match(creative, /class="btn btn-primary" type="button" disabled=""/);
    assert.match(creative, /Generate<\/button>/);

    const research = render(WorkbenchSurface, { workbench: profile("research-a", "research", {
      question: "What changed?",
      sources: [{ id: "source", title: "Primary source", url: "https://example.com/", status: "reviewed" }],
      conclusion: "Supported conclusion",
    }) });
    assert.match(research, /What changed\?/);
    assert.match(research, /Primary source/);
    assert.match(research, /Supported conclusion/);

    const custom = render(CustomWorkbenchHome, { workbench: profile("custom-a", "custom", {
      modules: ["checklist", "notes", "links"],
      tasks: [{ id: "task", title: "Custom action", done: false }],
      notes: "Reusable custom context",
      links: [{ id: "link", title: "Reference", url: "https://example.com/" }],
    }) });
    assert.match(custom, /Custom action/);
    assert.match(custom, /Reusable custom context/);
    assert.match(custom, /Reference/);
  } finally {
    await server.close();
  }
});
