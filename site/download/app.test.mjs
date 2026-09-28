import assert from "node:assert/strict";
import test from "node:test";
import {
  detectPlatform,
  fallbackRelease,
  isTrustedDownloadUrl,
  normalizeRelease,
  selectDownloadAssets,
  selectPublishedRelease,
} from "./app.mjs";

test("detectPlatform maps common browser platform strings", () => {
  assert.equal(detectPlatform({ userAgentData: { platform: "Windows" } }), "windows");
  assert.equal(detectPlatform({ platform: "MacIntel" }), "macos");
  assert.equal(detectPlatform({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }), "linux");
  assert.equal(detectPlatform({}), "windows");
});

test("fallbackRelease exposes trusted links for every supported artifact", () => {
  const release = fallbackRelease();
  const assets = selectDownloadAssets(release.assets);
  assert.equal(release.tagName, "v0.15.1-beta.7");
  assert.equal(release.prerelease, true);
  assert.deepEqual(
    Object.entries(assets).filter(([, asset]) => asset === null),
    [],
  );
});

test("selectDownloadAssets rejects untrusted URLs and ignores update metadata", () => {
  const trusted = fallbackRelease().assets;
  const assets = selectDownloadAssets([
    ...trusted,
    {
      name: "PI-Desktop-Setup-9.9.9.exe",
      browser_download_url: "https://example.com/PI-Desktop-Setup-9.9.9.exe",
    },
    {
      name: "latest.yml",
      browser_download_url: "https://github.com/AiW520/my-codex/releases/download/v0.15.1-beta.6/latest.yml",
    },
  ]);
  assert.match(assets.windowsInstaller.name, /0\.15\.1-beta\.7/);
  assert.equal(isTrustedDownloadUrl("javascript:alert(1)"), false);
  assert.equal(isTrustedDownloadUrl("https://github.com/other/repo/releases/download/v1/file.exe"), false);
});

test("selectDownloadAssets accepts the rebranded asset names while keeping legacy releases downloadable", () => {
  const release = fallbackRelease();
  const renamed = release.assets.map((asset) => ({
    ...asset,
    name: asset.name.replace(/^PI-Desktop|^pi-desktop/, "鞭陀-Desktop"),
  }));
  const assets = selectDownloadAssets(renamed);
  assert.equal(assets.windowsInstaller.name, "鞭陀-Desktop-Setup-0.15.1-beta.7.exe");
  assert.equal(assets.linuxDeb.name, "鞭陀-Desktop_0.15.1-beta.7_amd64.deb");
  assert.equal(assets.macArmDmg.name, "鞭陀-Desktop-0.15.1-beta.7-arm64.dmg");
});

test("selectPublishedRelease skips drafts and invalid release pages", () => {
  const release = selectPublishedRelease([
    { draft: true, tag_name: "v2", html_url: "https://github.com/AiW520/my-codex/releases/tag/v2" },
    { draft: false, tag_name: "v1", html_url: "https://example.com/releases/tag/v1" },
    {
      draft: false,
      prerelease: true,
      tag_name: "v0.15.1-beta.6",
      html_url: "https://github.com/AiW520/my-codex/releases/tag/v0.15.1-beta.6",
      assets: fallbackRelease().assets,
    },
  ]);
  assert.equal(release.tagName, "v0.15.1-beta.6");
  assert.equal(normalizeRelease(null), null);
});
