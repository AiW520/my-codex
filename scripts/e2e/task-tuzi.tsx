import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import { catalogs } from "@pi-desktop/i18n";
import type { AppSettings, ProviderPublic, SessionSummary } from "@pi-desktop/shared";
import { ModelConfigPage } from "../../apps/desktop/src/components/settings/ModelConfigPage";
import { Sidebar } from "../../apps/desktop/src/components/Sidebar";
import { TaskContextBar } from "../../apps/desktop/src/components/TaskContextBar";
import { ConversationTopbar } from "../../apps/desktop/src/components/ConversationTopbar";
import { api } from "../../apps/desktop/src/lib/api";
import { useAppStore } from "../../apps/desktop/src/stores/app-store";

declare global { var taskTuziProbe: () => Promise<unknown>; }
declare global { var taskTuziLayoutProbe: (width: number, theme: string) => Promise<unknown>; }
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
async function until(predicate: () => boolean, label: string) {
  const deadline = performance.now() + 4000;
  while (!predicate()) {
    if (performance.now() > deadline) throw new Error(`Timed out: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
const baseProvider = (id: string): ProviderPublic => ({
  id, name: id, vendorKey: "custom", type: "openai_compatible", protocol: "openai_compatible",
  enabled: true, authKind: "api_key_and_base_url", apiStyle: "responses",
  baseUrl: "https://api.tu-zi.com/v1/", hasSecret: true, supportsReasoning: false,
  supportedThinkingLevels: ["off"], models: [{ id: "fixture", contextWindow: 32000, maxTokens: 4000,
    thinkingLevels: ["off"], defaultThinkingLevel: "off" }], createdAt: "", updatedAt: "1",
});
const session = (id: string): SessionSummary => ({
  id, title: id, messageCount: 1, providerId: "existing", modelId: "fixture",
  mode: "agent", thinkingLevel: "off", permissionMode: "inherit",
  createdAt: "2026-09-28T00:00:00Z", updatedAt: "2026-09-28T00:00:00Z",
});

globalThis.taskTuziProbe = async () => {
  await i18n.init({ lng: "en", resources: {
    en: { translation: catalogs.en }, "zh-CN": { translation: catalogs["zh-CN"] },
  }, interpolation: { escapeValue: false } });
  let providers = [baseProvider("existing")];
  let settings: AppSettings = { defaultMode: "agent", defaultPermissionMode: "ask",
    theme: "light", enterToSend: true, onboardingDismissed: true };
  let revision = 1;
  let testResult: unknown = { ok: false, status: 401 };
  let refreshError: string | undefined;
  let resolveModels: ((value: Awaited<ReturnType<typeof api.listProviderModels>>) => void) | undefined;
  let deferModels = false;
  const saves: string[] = [];
  // Stub only Host/IPC boundaries. Production components, hooks and store flows remain real.
  api.listProviders = async () => ({ providers });
  api.listSessions = async () => ({ sessions: useAppStore.getState().sessions });
  api.getSettings = async () => settings;
  api.setSettings = async (next) => { settings = next; return settings; };
  api.getOnboarding = async () => ({ visible: false, hasProvider: true, hasSecret: true, hasSession: true });
  api.listOauthVendors = async () => ({ vendors: [] });
  api.modelCatalogStatus = async () => ({ status: { loaded: false, source: "empty", catalogPath: "", providerCount: 0, modelCount: 0 } });
  api.listProviderModels = async () => {
    if (deferModels) return new Promise((resolve) => { resolveModels = resolve; });
    return { models: [], source: "remote", error: refreshError };
  };
  api.testProvider = async () => { if (testResult instanceof Error) throw testResult; return testResult; };
  api.createProvider = async (input) => {
    assert(input.apiStyle === "responses", "preset must save Responses");
    assert(input.baseUrl === "https://gaccode.com/codex/v1", "wrong preset endpoint");
    saves.push(input.baseUrl);
    const provider = { ...baseProvider("created"), ...input, hasSecret: Boolean(input.secretValue) };
    // Host public objects never return the submitted secret.
    delete provider.secretValue;
    providers = [...providers, provider];
    return { provider };
  };
  api.updateProvider = async (input) => {
    saves.push(input.baseUrl ?? "");
    const provider = { ...providers.find((item) => item.id === input.id)!, ...input, updatedAt: String(++revision) };
    providers = providers.map((item) => item.id === provider.id ? provider : item);
    return { provider };
  };
  api.updatesGetState = async () => { throw new Error("unavailable in fixture"); };
  api.onUpdateState = () => () => {};
  const errors: unknown[] = [];
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host, { onUncaughtError: (error) => errors.push(error) });
  const render = (view: "settings" | "tasks" | "none") => flushSync(() => root.render(
    <I18nextProvider i18n={i18n}>{view === "settings" ? <ModelConfigPage /> : view === "tasks" ? <>
      <TaskContextBar /><Sidebar onToggleSidebar={() => {}} sidebarToggleShortcut="" sidebarWidth={260}
        onWidthChange={() => {}} onWidthCommit={() => {}} />
    </> : null}</I18nextProvider>,
  ));
  const row = (id: string) => document.querySelector<HTMLElement>(`[data-tuzi-preset="${id}"]`)!;
  const button = (scope: ParentNode, key: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")]
    .find((element) => element.textContent?.trim() === i18n.t(key) || element.getAttribute("aria-label") === i18n.t(key))!;
  const click = (element: HTMLElement | null) => { assert(element, "click target missing"); flushSync(() => element!.click()); };
  const input = (element: HTMLInputElement, value: string) => flushSync(() => {
    assert(element, "input missing");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const notes: string[] = [];
  try {
    for (const locale of ["en", "zh-CN"]) {
      render("none");
      await i18n.changeLanguage(locale);
      providers = [baseProvider("existing")];
      settings = { ...settings, defaultProviderId: undefined, defaultModelId: undefined };
      flushSync(() => useAppStore.setState({ providers, settings, providerModels: {} }));
      render("settings");
      assert(document.querySelectorAll("[data-tuzi-preset]").length === 3, "three service entries required");
      assert(row("tuzi-api").textContent?.includes("existing"), "match endpoint despite custom vendor label");
      assert(!button(row("gac-codex"), "settings.testConnection"), "unconfigured service cannot test");
      click(button(row("gac-codex"), "settings.addProvider"));
      const dialog = () => document.querySelector<HTMLElement>(".provider-setup-dialog")!;
      input(dialog().querySelector<HTMLInputElement>('input[type="password"]')!, "fixture-only-key");
      input(dialog().querySelector<HTMLInputElement>(".provider-custom-model-row input")!, "fixture");
      click(dialog().querySelector<HTMLButtonElement>(".provider-custom-model-row button"));
      click(button(dialog(), "settings.saveProvider"));
      await until(() => !dialog() && providers.length === 2, "save preset and close");
      await until(() => useAppStore.getState().settings?.defaultProviderId === "created", "default after create");
      click(button(document.querySelector(".model-provider-list")!, "settings.editProvider"));
      assert(dialog().textContent?.includes("api.tu-zi.com/v1") ||
        [...dialog().querySelectorAll("input")].some((element) => element.value.replace(/\/$/, "") === "https://api.tu-zi.com/v1"),
      "ordinary edit must not inherit GAC preset");
      click(button(dialog(), "settings.saveProvider"));
      await until(() => !dialog(), "edit saved");
      assert(saves.at(-1)?.replace(/\/$/, "") === "https://api.tu-zi.com/v1", "ordinary edit overwrote endpoint");
      click(button(row("tuzi-api"), "settings.makeDefault"));
      await until(() => useAppStore.getState().settings?.defaultProviderId === "existing", "set default");
      assert(settings.defaultModelId === "fixture", "wrong default model");
      for (const [result, key] of [
        [{ ok: false, status: 401 }, "errors.PROVIDER_UNAUTHORIZED"],
        [{ ok: false, status: 429 }, "errors.PROVIDER_RATE_LIMITED"],
        [{ ok: true, credential: "unverified" }, "settings.testEndpointOnly"],
        [{ ok: true, credential: "verified" }, "settings.testOk"],
        [Object.assign(new Error("private transport detail"), { code: "NETWORK_ERROR" }), "errors.NETWORK_ERROR"],
      ] as const) {
        testResult = result;
        click(button(row("tuzi-api"), "settings.testConnection"));
        await until(() => Boolean(row("tuzi-api").textContent?.includes(i18n.t(key))), key);
      }
      const cached = [{ id: "cached", name: "Cached", provider: "fixture", reasoning: false,
        input: ["text" as const], contextWindow: 32000, maxTokens: 4000,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }];
      flushSync(() => useAppStore.setState({ providerModels: { existing: cached } }));
      refreshError = "HTTP 503";
      click(button(row("tuzi-api"), "settings.tuziRefreshModels"));
      await until(() => Boolean(row("tuzi-api").textContent?.includes("503")), "classified refresh error");
      assert(useAppStore.getState().providerModels.existing === cached, "failure erased discovery cache");
      refreshError = undefined;
      deferModels = true;
      click(button(row("tuzi-api"), "settings.tuziRefreshModels"));
      await until(() => Boolean(resolveModels), "refresh pending");
      render("none");
      resolveModels!({ models: [], source: "remote" });
      await Promise.resolve(); await Promise.resolve();
      assert(useAppStore.getState().providerModels.existing === cached, "unmounted refresh wrote stale cache");
      deferModels = false; resolveModels = undefined;
      notes.push(`${locale}:preset-save-edit-default-auth-refresh-unmount`);

      const sessions = [session("done"), session("failed"), session("running"), session("approval")];
      flushSync(() => useAppStore.setState({ sessions, activeSessionId: "done", page: "chat",
        runningSessions: { running: true }, planningStates: { approval: "awaiting_approval" },
        pendingPermissions: {}, latestTurnResults: {
          done: { status: "completed", turnId: "t1", finishedAt: 2 },
          failed: { status: "failed", turnId: "t2", finishedAt: 3 },
        }, notifications: [], sessionOutcomes: { failed: "failed" },
        workspace: { path: "/unrelated", name: "Unrelated", branch: "wrong-branch" }, openProjects: [],
        openProjectPaths: [], projectMeta: {}, sessionMeta: {} }));
      render("tasks");
      const context = () => document.querySelector<HTMLElement>(".task-context-bar")!;
      assert(context().textContent?.includes(i18n.t("taskContext.status.completed")), "read completion disappears");
      assert(!context().textContent?.includes("wrong-branch"), "temporary task inherits unrelated branch");
      const before = useAppStore.getState().sessions;
      const filter = document.querySelector<HTMLSelectElement>(".sidebar-status-filter")!;
      for (const [value, ids] of [["completed", ["done"]], ["failed", ["failed"]],
        ["running", ["running"]], ["permission", ["approval"]], ["unread", ["failed"]],
        ["all", ["approval", "done", "failed", "running"]]] as const) {
        flushSync(() => { filter.value = value; filter.dispatchEvent(new Event("change", { bubbles: true })); });
        const visible = [...document.querySelectorAll("[data-sidebar-session-row]")]
          .map((element) => element.getAttribute("data-sidebar-session-row")).sort();
        assert(JSON.stringify(visible) === JSON.stringify(ids), `${locale}:${value}: ${visible}`);
      }
      assert(useAppStore.getState().sessions === before, "filter changed saved sessions");
      assert(useAppStore.getState().runningSessions.running, "filter stopped a turn");
      flushSync(() => useAppStore.setState({ activeSessionId: "approval" }));
      assert(context().textContent?.includes(i18n.t("taskContext.status.permission")), "plan approval state missing");
      notes.push(`${locale}:task-context-status-filters-read-independence`);
    }
    assert(errors.length === 0, `React crashed: ${errors.map(String).join(", ")}`);
    return { ok: true, scenarios: notes, apiBoundary: "stubbed", liveModel: "not exercised" };
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.stack : String(error)}; React errors: ${errors.map((item) => item instanceof Error ? item.stack : String(item)).join(", ")}; stages: ${notes.join(", ")}`);
  } finally { flushSync(() => root.unmount()); host.remove(); }
};

let layoutRoot: ReturnType<typeof createRoot> | undefined;
globalThis.taskTuziLayoutProbe = async (width, theme) => {
  document.documentElement.dataset.theme = theme;
  let host = document.getElementById("layout-fixture");
  if (!host) {
    host = document.createElement("div"); host.id = "layout-fixture"; document.body.append(host);
    layoutRoot = createRoot(host);
  }
  const task = { ...session("layout"), projectPath: "/repo", thinkingLevel: "high" as const };
  flushSync(() => useAppStore.setState({ sessions: [task], activeSessionId: task.id,
    workspace: { path: "/repo", name: "A long project name for narrow widths", branch: "codex/long-branch-name" },
    openProjects: [], runningSessions: { layout: true }, providers: [baseProvider("existing")] }));
  flushSync(() => layoutRoot!.render(<I18nextProvider i18n={i18n}>
    <main className="main-pane" style={{ width, height: 700, position: "relative" }}>
      <ConversationTopbar sidebarCollapsed={false} workPanelOpen={false} onToggleSidebar={() => {}} onNewTask={() => {}} onOpenSearch={() => {}} />
      <div className="chat-surface"><TaskContextBar /><div className="session-panes"><div className="session-pane">
        <div className="thread-content"><p data-first-message>Task transcript stays below the context bar.</p></div>
      </div></div></div>
    </main>
  </I18nextProvider>));
  await new Promise(requestAnimationFrame);
  const rect = (selector: string) => host!.querySelector(selector)!.getBoundingClientRect();
  const bar = rect(".task-context-bar");
  const toolbar = rect(".conversation-topbar");
  const message = rect("[data-first-message]");
  const main = rect("main");
  const status = rect(".task-context-status");
  assert(bar.top >= toolbar.bottom - 1, "context overlaps title toolbar");
  assert(message.top >= bar.bottom - 1, "context covers first message");
  assert(bar.right <= main.right + 1 && status.right <= main.right + 1, "context overflows pane");
  return { width, theme, ok: true };
};
