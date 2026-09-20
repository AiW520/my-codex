import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import { catalogs } from "@pi-desktop/i18n";
import { createServer } from "vite";

const profile = (id, name, templateId, position) => ({
  id,
  name,
  templateId,
  icon: templateId,
  position,
  motionEnabled: true,
  motionIntensity: 70,
  wallpaperOpacity: 20,
  layoutPreset: "default",
  modelRoles: {},
  dashboardState: {},
  projectPaths: [],
  sessionIds: [],
  dataVersion: 1,
  createdAt: 1,
  updatedAt: 1,
});

test("workbench launcher renders every default space and exposes switch state", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    esbuild: { jsx: "automatic" },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { WorkbenchLauncher } = await server.ssrLoadModule(
      "/src/components/WorkbenchLauncher.tsx",
    );
    const { useWorkbenchStore } = await server.ssrLoadModule(
      "/src/stores/workbench-store.ts",
    );
    await i18n.init({ lng: "en", resources: { en: { translation: catalogs.en } } });

    const workbenches = [
      profile("coding", "Coding", "coding", 0),
      profile("daily", "Daily", "daily", 1),
      profile("creative", "Creative", "creative", 2),
      profile("research", "Research", "research", 3),
    ];
    const render = (state, switchingId = null) => {
      Object.assign(useWorkbenchStore.getInitialState(), { state, switchingId });
      useWorkbenchStore.setState({ state, switchingId });
      return renderToStaticMarkup(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(WorkbenchLauncher),
        ),
      );
    };

    const html = render({ activeWorkbenchId: "coding", workbenches }, "daily");
    for (const workbench of workbenches) {
      assert.ok(html.includes(workbench.name), `missing ${workbench.name} in ${html}`);
    }
    assert.match(html, /class="workbench-launcher-item is-coding is-active"/);
    assert.match(html, /class="workbench-launcher-item is-daily is-switching"/);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 4);
    assert.match(html, /aria-current="page"/);

    assert.equal(
      render({ activeWorkbenchId: "coding", workbenches: workbenches.slice(0, 1) }),
      "",
    );
  } finally {
    await server.close();
  }
});
