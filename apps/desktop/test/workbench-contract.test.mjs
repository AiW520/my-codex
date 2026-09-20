import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("workbench IPC is allowlisted and registered through the bounded host bridge", () => {
  const protocol = read("../../../packages/shared/src/protocol.ts");
  const register = read("../electron/main/ipc/register.ts");
  const ipc = read("../electron/main/ipc/workbench-ipc.ts");
  for (const name of ["List", "Create", "Update", "Activate", "Reorder", "Delete"]) {
    assert.match(protocol, new RegExp(`workbench${name}:`));
  }
  assert.match(register, /registerWorkbenchIpc/);
  assert.match(ipc, /getHost\(\)/);
  assert.doesNotMatch(ipc, /sqlite|Database/);
});

test("renderer exposes all templates and an honest unconfigured media state", () => {
  const shell = read("../src/features/app/AppShell.tsx");
  const surface = read("../src/components/WorkbenchSurface.tsx");
  const creative = read("../src/components/workbenches/CreativeWorkbench.tsx");
  const research = read("../src/components/workbenches/ResearchWorkbench.tsx");
  const custom = read("../src/components/workbenches/CustomWorkbenchHome.tsx");
  const chat = read("../src/components/ChatSurface.tsx");
  const switcher = read("../src/components/WorkbenchSwitcher.tsx");
  const launcher = read("../src/components/WorkbenchLauncher.tsx");
  assert.match(shell, /activeWorkbench\.templateId !== "coding"/);
  for (const template of ["coding", "daily", "creative", "research", "custom"]) {
    assert.match(switcher, new RegExp(`"${template}"`));
  }
  assert.match(creative, /creative\.notConfigured/);
  assert.match(creative, /variant="primary" disabled/);
  assert.match(surface, /key=\{workbench\.id\}/);
  assert.match(research, /api\.browserOpenExternal\(url\)/);
  assert.match(custom, /api\.browserOpenExternal\(url\)/);
  assert.match(chat, /CustomWorkbenchHome key=\{activeWorkbench\.id\}/);
  assert.doesNotMatch(`${creative}${research}${custom}`, /fake|mock asset|sample citation/i);
  assert.match(launcher, /state\.workbenches\.map/);
  assert.match(launcher, /selectWorkbench\(workbench\.id\)/);
  assert.match(switcher, /motionIntensity/);
  assert.match(switcher, /wallpaperOpacity/);
  assert.match(switcher, /themeId/);
});

test("effective workbench theme never writes the persisted global setting", () => {
  const runtime = read("../src/features/app/useAppShellRuntime.tsx");
  assert.match(runtime, /activeWorkbench\?\.themeId \?\? globalPreference/);
  assert.doesNotMatch(runtime, /setSettings\(|setTheme\(/);
  assert.match(runtime, /prefers-reduced-motion/);
});
