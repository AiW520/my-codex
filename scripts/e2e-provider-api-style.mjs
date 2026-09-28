#!/usr/bin/env node
/** Real React/Chromium coverage for the custom-provider API-format boundary. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveElectronBinary } from "./e2e/boot.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  join(root, "packages/agent-runtime/package.json"),
);
const { build } = require("esbuild");
const { electronBinary } = resolveElectronBinary(root);
// Share the isolated Chromium runner with the task/configuration user journey.
const taskTuzi = process.argv.includes("--task-tuzi");
const fixtureName = taskTuzi ? "task-tuzi" : "provider-api-style";
const probeName = taskTuzi ? "taskTuziProbe" : "providerApiStyleProbe";
const marker = taskTuzi ? "TASK_TUZI_PROBE " : "PROVIDER_API_STYLE_PROBE ";
const temp = await mkdtemp(join(tmpdir(), "pi-provider-api-style-"));
try {
  await build({
    entryPoints: [join(root, `scripts/e2e/${fixtureName}.tsx`)],
    outfile: join(temp, "renderer.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    // Exercise API-format interactions with real components/hooks, not visual layout.
    loader: { ".css": "empty", ".png": "file" },
    alias: {
      "@pi-desktop/i18n": join(root, "packages/i18n/src/index.ts"),
      // The fixture lives outside the desktop package; use its React instance.
      react: join(root, "apps/desktop/node_modules/react"),
      "react-dom": join(root, "apps/desktop/node_modules/react-dom"),
    },
    nodePaths: [join(root, "apps/desktop/node_modules")],
  });
  let styles = "";
  if (taskTuzi) {
    const renderer = join(root, "apps/desktop/out/renderer");
    const html = await readFile(join(renderer, "index.html"), "utf8");
    styles = [...html.matchAll(/href="([^" ]+\.css)"/g)].map((match) => `<link rel="stylesheet" href="${match[1]}">`).join("");
    assert(styles, "Build desktop before the task/configuration layout probe");
    await cp(join(renderer, "assets"), join(temp, "assets"), { recursive: true });
  }
  await writeFile(
    join(temp, "index.html"),
    `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:"><title>Provider regression</title>${styles}<body><script src="renderer.js"></script>`,
  );
  await writeFile(
    join(temp, "main.cjs"),
    `
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
app.setPath("userData", path.join(__dirname, "profile"));
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1100, height: 800, webPreferences: { backgroundThrottling: false, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  window.webContents.on("console-message", (event) => console.error(event.message));
  try {
    await window.loadFile(path.join(__dirname, "index.html"));
    const result = await window.webContents.executeJavaScript("globalThis.${probeName}()");
    if (${taskTuzi}) {
      result.layouts = [];
      for (const width of [450, 900]) {
        for (const theme of ["light", "dark"]) {
          const layout = await window.webContents.executeJavaScript("globalThis.taskTuziLayoutProbe(" + width + "," + JSON.stringify(theme) + ")");
          result.layouts.push(layout);
          if (process.env.PI_E2E_ARTIFACT_DIR) {
            const fs = require("node:fs");
            fs.mkdirSync(process.env.PI_E2E_ARTIFACT_DIR, { recursive: true });
            fs.writeFileSync(path.join(process.env.PI_E2E_ARTIFACT_DIR, "task-tuzi-" + width + "-" + theme + ".png"), (await window.webContents.capturePage()).toPNG());
          }
        }
      }
    }
    console.log(${JSON.stringify(marker)} + JSON.stringify(result));
    app.quit();
  } catch (error) {
    console.error(${JSON.stringify(marker)} + JSON.stringify({ ok: false, error: String(error) }));
    app.exit(1);
  }
});
`,
  );
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronBinary, [join(temp, "main.cjs")], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      output += data;
    });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 45_000);
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
  } finally {
    clearTimeout(timeout);
  }
  const line = output
    .split(/\r?\n/)
    .find((line) => line.startsWith(marker));
  assert(
    line,
    `renderer returned no probe result (exit=${code}): ${output.slice(-2000)}`,
  );
  const result = JSON.parse(line.slice(marker.length));
  console.log(marker + JSON.stringify(result));
  assert.equal(code, 0, output.slice(-6000));
  assert.equal(result.ok, true);
} finally {
  await rm(temp, { recursive: true, force: true });
}
