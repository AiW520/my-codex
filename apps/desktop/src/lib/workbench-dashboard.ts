import type { WorkbenchProfile } from "@pi-desktop/shared";

export type DailyPriority = "high" | "medium" | "low";
export type DailyBucket = "today" | "later";
export type DailyTask = {
  id: string;
  title: string;
  done: boolean;
  priority: DailyPriority;
  bucket: DailyBucket;
};

export type CreativeOutputType = "image" | "video";
export type CreativeBrief = {
  id: string;
  title: string;
  prompt: string;
  negativePrompt: string;
  outputType: CreativeOutputType;
  aspectRatio: string;
  createdAt: number;
};

export type ResearchStatus = "unread" | "reading" | "reviewed";
export type ResearchSource = {
  id: string;
  title: string;
  url: string;
  status: ResearchStatus;
};

export const CUSTOM_MODULES = ["checklist", "notes", "links"] as const;
export type CustomModuleId = (typeof CUSTOM_MODULES)[number];

const MAX_TASKS = 200;
const MAX_BRIEFS = 80;
const MAX_SOURCES = 200;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maxLength = 8_000): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

function parseTask(value: unknown): DailyTask | null {
  const item = record(value);
  const id = text(item.id, 160).trim();
  const title = text(item.title, 500).trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    done: item.done === true,
    priority: oneOf(item.priority, ["high", "medium", "low"], "medium"),
    bucket: oneOf(item.bucket, ["today", "later"], "today"),
  };
}

function parseTasks(value: unknown, limit = MAX_TASKS): DailyTask[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).flatMap((item) => {
    const task = parseTask(item);
    return task ? [task] : [];
  });
}

export function parseDailyDashboard(value: unknown) {
  const state = record(value);
  return {
    tasks: parseTasks(state.tasks),
    focus: text(state.focus, 500),
    notes: text(state.notes),
  };
}

export function dailyProgress(tasks: DailyTask[]) {
  const completed = tasks.filter((task) => task.done).length;
  const open = tasks.length - completed;
  const highPriorityOpen = tasks.filter((task) => !task.done && task.priority === "high").length;
  return {
    completed,
    open,
    highPriorityOpen,
    percent: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
  };
}

function parseBrief(value: unknown): CreativeBrief | null {
  const item = record(value);
  const id = text(item.id, 160).trim();
  const prompt = text(item.prompt).trim();
  if (!id || !prompt) return null;
  return {
    id,
    title: text(item.title, 240).trim() || prompt.slice(0, 80),
    prompt,
    negativePrompt: text(item.negativePrompt, 4_000),
    outputType: oneOf(item.outputType, ["image", "video"], "image"),
    aspectRatio: text(item.aspectRatio, 40).trim() || "1:1",
    createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
  };
}

export function parseCreativeDashboard(value: unknown) {
  const state = record(value);
  const briefs = Array.isArray(state.briefs)
    ? state.briefs.slice(0, MAX_BRIEFS).flatMap((item) => {
        const brief = parseBrief(item);
        return brief ? [brief] : [];
      })
    : [];
  return {
    title: text(state.title, 240),
    prompt: text(state.prompt),
    negativePrompt: text(state.negativePrompt, 4_000),
    outputType: oneOf(state.outputType, ["image", "video"], "image") as CreativeOutputType,
    aspectRatio: text(state.aspectRatio, 40).trim() || "1:1",
    briefs,
  };
}

export function safeResearchUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_048 || !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function parseSource(value: unknown): ResearchSource | null {
  const item = record(value);
  const id = text(item.id, 160).trim();
  const url = safeResearchUrl(item.url);
  if (!id || !url) return null;
  return {
    id,
    title: text(item.title, 500).trim() || url,
    url,
    status: oneOf(item.status, ["unread", "reading", "reviewed"], "unread"),
  };
}

function parseSources(value: unknown, limit = MAX_SOURCES): ResearchSource[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).flatMap((item) => {
    const source = parseSource(item);
    return source ? [source] : [];
  });
}

export function parseResearchDashboard(value: unknown) {
  const state = record(value);
  return {
    question: text(state.question, 1_000),
    sources: parseSources(state.sources),
    notes: text(state.notes),
    conclusion: text(state.conclusion),
  };
}

export function researchProgress(sources: ResearchSource[]) {
  const reviewed = sources.filter((source) => source.status === "reviewed").length;
  return {
    reviewed,
    reading: sources.filter((source) => source.status === "reading").length,
    percent: sources.length === 0 ? 0 : Math.round((reviewed / sources.length) * 100),
  };
}

export function parseCustomDashboard(value: unknown) {
  const state = record(value);
  const configuredModules = Array.isArray(state.modules) ? state.modules : null;
  const modules = configuredModules
    ? CUSTOM_MODULES.filter((module) => configuredModules.includes(module))
    : ["checklist", "notes"];
  return {
    modules: modules.length > 0 ? modules : (["notes"] as CustomModuleId[]),
    tasks: parseTasks(state.tasks, 100),
    notes: text(state.notes),
    links: parseSources(state.links, 100),
  };
}

export type WorkbenchSummary = {
  primary: number;
  secondary: number;
  kind: WorkbenchProfile["templateId"];
};

export function summarizeWorkbench(workbench: WorkbenchProfile): WorkbenchSummary {
  switch (workbench.templateId) {
    case "coding":
      return {
        kind: "coding",
        primary: workbench.projectPaths.length,
        secondary: workbench.sessionIds.length,
      };
    case "daily": {
      const progress = dailyProgress(parseDailyDashboard(workbench.dashboardState).tasks);
      return { kind: "daily", primary: progress.open, secondary: progress.completed };
    }
    case "creative":
      return {
        kind: "creative",
        primary: parseCreativeDashboard(workbench.dashboardState).briefs.length,
        secondary: Object.keys(workbench.modelRoles).length,
      };
    case "research": {
      const sources = parseResearchDashboard(workbench.dashboardState).sources;
      return {
        kind: "research",
        primary: sources.length,
        secondary: sources.filter((source) => source.status === "reviewed").length,
      };
    }
    case "custom":
      return {
        kind: "custom",
        primary: parseCustomDashboard(workbench.dashboardState).modules.length,
        secondary: workbench.projectPaths.length + workbench.sessionIds.length,
      };
  }

  throw new Error(`Unsupported workbench template: ${workbench.templateId}`);
}

export function newWorkbenchItemId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
