import type { ThemePreference } from "./settings.js";

export const WORKBENCH_TEMPLATES = [
  "coding",
  "daily",
  "creative",
  "research",
  "custom",
] as const;

export type WorkbenchTemplateId = (typeof WORKBENCH_TEMPLATES)[number];

export type WorkbenchModelRole =
  | "primary"
  | "assistant"
  | "vision"
  | "image"
  | "video";

export type WorkbenchModelRef = {
  providerId: string;
  modelId: string;
};

export type WorkbenchProfile = {
  id: string;
  name: string;
  templateId: WorkbenchTemplateId;
  icon: string;
  position: number;
  /** Workbench-owned visual theme. Absent follows the global app preference. */
  themeId?: ThemePreference | string | null;
  motionEnabled: boolean;
  motionIntensity: number;
  wallpaperOpacity: number;
  layoutPreset: string;
  lastProjectPath?: string | null;
  lastSessionId?: string | null;
  modelRoles: Partial<Record<WorkbenchModelRole, WorkbenchModelRef>>;
  /** Template-owned local data; host validates object shape and size. */
  dashboardState: Record<string, unknown>;
  projectPaths: string[];
  sessionIds: string[];
  dataVersion: number;
  createdAt: number;
  updatedAt: number;
};

export type WorkbenchState = {
  activeWorkbenchId: string;
  workbenches: WorkbenchProfile[];
};

export type WorkbenchUpdate = Partial<
  Pick<
    WorkbenchProfile,
    | "name"
    | "icon"
    | "themeId"
    | "motionEnabled"
    | "motionIntensity"
    | "wallpaperOpacity"
    | "layoutPreset"
    | "modelRoles"
    | "dashboardState"
  >
>;
