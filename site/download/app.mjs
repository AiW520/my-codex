const REPOSITORY = "AiW520/my-codex";
const RELEASES_API = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=10`;

const FALLBACK_RELEASE = {
  tagName: "v0.15.1-beta.3",
  prerelease: true,
  publishedAt: null,
  url: `https://github.com/${REPOSITORY}/releases/tag/v0.15.1-beta.3`,
  assetNames: [
    "PI-Desktop-Setup-0.15.1-beta.3.exe",
    "PI-Desktop-Portable-0.15.1-beta.3.exe",
    "PI-Desktop-0.15.1-beta.3-arm64.dmg",
    "PI-Desktop-0.15.1-beta.3-arm64-mac.zip",
    "PI-Desktop-0.15.1-beta.3-x64.dmg",
    "PI-Desktop-0.15.1-beta.3-x64-mac.zip",
    "PI-Desktop-0.15.1-beta.3.AppImage",
    "pi-desktop_0.15.1-beta.3_amd64.deb",
    "pi-desktop-0.15.1-beta.3-x86_64.rpm",
    "PI-Desktop-0.15.1-beta.3-linux-x64.asar",
  ],
};

export function detectPlatform(navigatorLike = {}) {
  const value = `${navigatorLike.userAgentData?.platform ?? ""} ${navigatorLike.platform ?? ""} ${navigatorLike.userAgent ?? ""}`.toLowerCase();
  if (value.includes("win")) return "windows";
  if (value.includes("mac")) return "macos";
  if (value.includes("linux") || value.includes("x11")) return "linux";
  return "windows";
}

export function isTrustedDownloadUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith(`/${REPOSITORY}/releases/download/`)
    );
  } catch {
    return false;
  }
}

function findAsset(assets, pattern) {
  return assets.find((asset) => pattern.test(asset.name)) ?? null;
}

export function selectDownloadAssets(assets) {
  const eligible = assets.filter(
    (asset) => typeof asset?.name === "string" && isTrustedDownloadUrl(asset.browser_download_url),
  );

  return {
    windowsInstaller: findAsset(eligible, /^PI-Desktop-Setup-.*\.exe$/i),
    windowsPortable: findAsset(eligible, /^PI-Desktop-Portable-.*\.exe$/i),
    macArmDmg: findAsset(eligible, /^PI-Desktop-.*-arm64\.dmg$/i),
    macArmZip: findAsset(eligible, /^PI-Desktop-.*-arm64-mac\.zip$/i),
    macIntelDmg: findAsset(eligible, /^PI-Desktop-.*-x64\.dmg$/i),
    macIntelZip: findAsset(eligible, /^PI-Desktop-.*-x64-mac\.zip$/i),
    linuxAppImage: findAsset(eligible, /^PI-Desktop-.*\.AppImage$/i),
    linuxDeb: findAsset(eligible, /^pi-desktop_.*_amd64\.deb$/i),
    linuxRpm: findAsset(eligible, /^pi-desktop-.*-x86_64\.rpm$/i),
    linuxAsar: findAsset(eligible, /^PI-Desktop-.*-linux-x64\.asar$/i),
  };
}

export function fallbackRelease() {
  const encodedTag = encodeURIComponent(FALLBACK_RELEASE.tagName);
  return {
    ...FALLBACK_RELEASE,
    assets: FALLBACK_RELEASE.assetNames.map((name) => ({
      name,
      browser_download_url: `https://github.com/${REPOSITORY}/releases/download/${encodedTag}/${encodeURIComponent(name)}`,
    })),
  };
}

export function normalizeRelease(rawRelease) {
  if (!rawRelease || rawRelease.draft || typeof rawRelease.tag_name !== "string") return null;
  const url = typeof rawRelease.html_url === "string" ? rawRelease.html_url : "";
  if (!url.startsWith(`https://github.com/${REPOSITORY}/releases/tag/`)) return null;
  return {
    tagName: rawRelease.tag_name,
    prerelease: Boolean(rawRelease.prerelease),
    publishedAt: rawRelease.published_at ?? null,
    url,
    assets: Array.isArray(rawRelease.assets) ? rawRelease.assets : [],
  };
}

export function selectPublishedRelease(releases) {
  if (!Array.isArray(releases)) return null;
  for (const release of releases) {
    const normalized = normalizeRelease(release);
    if (normalized) return normalized;
  }
  return null;
}

function setPlatform(platform, documentLike = document) {
  for (const tab of documentLike.querySelectorAll("[data-platform]")) {
    const selected = tab.dataset.platform === platform;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of documentLike.querySelectorAll("[data-panel]")) {
    panel.hidden = panel.dataset.panel !== platform;
  }
}

function renderRelease(release, source, documentLike = document) {
  const assets = selectDownloadAssets(release.assets);
  documentLike.querySelector("#release-version").textContent = release.tagName;
  documentLike.querySelector("#release-channel").textContent = release.prerelease ? "预发布" : "正式版本";

  for (const link of documentLike.querySelectorAll("#release-link, #all-assets-link")) {
    link.href = release.url;
  }

  for (const link of documentLike.querySelectorAll("[data-asset]")) {
    const asset = assets[link.dataset.asset];
    link.classList.toggle("is-unavailable", !asset);
    if (asset) {
      link.href = asset.browser_download_url;
      link.setAttribute("download", "");
    } else {
      link.removeAttribute("href");
    }
  }

  const publishedDate = release.publishedAt
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(release.publishedAt))
    : "日期未知";
  documentLike.querySelector("#release-status").textContent =
    source === "api"
      ? `${release.tagName} · 发布于 ${publishedDate} · 下载链接已从 GitHub Release 同步。`
      : `${release.tagName} · 发布于 ${publishedDate} · 当前使用页面内置的已验证下载链接。`;

  return assets;
}

function configurePrimaryAction(platform, assets, documentLike = document) {
  const primary = documentLike.querySelector("#primary-download");
  const recommended =
    platform === "windows"
      ? assets.windowsInstaller
      : platform === "linux"
        ? assets.linuxAppImage
        : null;

  if (recommended) {
    primary.href = recommended.browser_download_url;
    primary.textContent = platform === "windows" ? "下载 Windows 安装版" : "下载 Linux AppImage";
    primary.setAttribute("download", "");
    return;
  }

  primary.href = "#downloads";
  primary.textContent = platform === "macos" ? "选择 macOS 芯片版本" : "选择下载版本";
  primary.removeAttribute("download");
}

async function loadRelease(fetchLike = fetch) {
  try {
    const response = await fetchLike(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    const release = selectPublishedRelease(await response.json());
    if (!release) throw new Error("No published GitHub Release was returned");
    return { release, source: "api" };
  } catch (error) {
    console.warn("Could not refresh release metadata; using verified fallback.", error);
    return { release: fallbackRelease(), source: "fallback" };
  }
}

export async function initializePage({ documentLike = document, navigatorLike = navigator, fetchLike = fetch } = {}) {
  const platform = detectPlatform(navigatorLike);
  setPlatform(platform, documentLike);

  for (const tab of documentLike.querySelectorAll("[data-platform]")) {
    tab.addEventListener("click", () => setPlatform(tab.dataset.platform, documentLike));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const tabs = [...documentLike.querySelectorAll("[data-platform]")];
      const index = tabs.indexOf(tab);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(index + offset + tabs.length) % tabs.length];
      setPlatform(next.dataset.platform, documentLike);
      next.focus();
    });
  }

  const { release, source } = await loadRelease(fetchLike);
  const assets = renderRelease(release, source, documentLike);
  configurePrimaryAction(platform, assets, documentLike);
}

if (typeof document !== "undefined") {
  void initializePage();
}
