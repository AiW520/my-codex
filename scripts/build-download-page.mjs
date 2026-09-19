import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repositoryRoot, "site", "download");
const output = path.join(repositoryRoot, "dist", "download-page");
const assets = path.join(output, "assets");

await rm(output, { recursive: true, force: true });
await mkdir(assets, { recursive: true });
await cp(source, output, { recursive: true });
await rm(path.join(output, "app.test.mjs"));
await cp(path.join(repositoryRoot, "docs", "image", "readme", "logo.png"), path.join(assets, "logo.png"));
await cp(path.join(repositoryRoot, "docs", "image", "readme", "home_zh.webp"), path.join(assets, "pi-desktop.webp"));
await writeFile(path.join(output, ".nojekyll"), "", "utf8");

console.log(`Built GitHub Pages site at ${path.relative(repositoryRoot, output)}`);
