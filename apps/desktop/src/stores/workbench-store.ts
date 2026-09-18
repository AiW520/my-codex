import { create } from "zustand";
import type {
  WorkbenchProfile,
  WorkbenchState,
  WorkbenchTemplateId,
  WorkbenchUpdate,
} from "@pi-desktop/shared";
import { api } from "../lib/api";
import { useAppStore } from "./app-store";
import { WorkbenchSelectionCoordinator } from "../lib/workbench-selection";

type WorkbenchStore = {
  state: WorkbenchState | null;
  loading: boolean;
  switchingId: string | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  selectWorkbench: (id: string) => Promise<void>;
  createWorkbench: (
    name: string,
    templateId: WorkbenchTemplateId,
  ) => Promise<WorkbenchProfile>;
  updateWorkbench: (id: string, patch: WorkbenchUpdate) => Promise<WorkbenchProfile>;
  updateDashboard: (
    id: string,
    dashboardState: Record<string, unknown>,
  ) => Promise<WorkbenchProfile>;
  reorderWorkbenches: (ids: string[]) => Promise<void>;
  deleteWorkbench: (id: string) => Promise<void>;
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function profileIn(state: WorkbenchState | null, id: string | null | undefined) {
  return id ? state?.workbenches.find((workbench) => workbench.id === id) : undefined;
}

async function restoreWorkbenchContext(
  workbench: WorkbenchProfile,
): Promise<void> {
  const app = useAppStore.getState();
  const session = workbench.lastSessionId
    ? app.sessions.find((candidate) => candidate.id === workbench.lastSessionId)
    : undefined;
  if (session) {
    await app.selectSession(session.id);
    return;
  }
  if (workbench.lastProjectPath) {
    try {
      await app.activateProject(workbench.lastProjectPath);
    } catch (error) {
      // A folder may have moved since the profile was last used. Keep the
      // profile active and leave the existing navigation context untouched.
      app.showToast(messageFrom(error), { variant: "warning" });
    }
  }
}

const selectionCoordinator = new WorkbenchSelectionCoordinator<WorkbenchProfile>({
  currentContext: () => {
    const workbench = profileIn(
      useWorkbenchStore.getState().state,
      useWorkbenchStore.getState().state?.activeWorkbenchId,
    );
    if (!workbench) return null;
    const app = useAppStore.getState();
    return {
      workbenchId: workbench.id,
      projectPath: app.workspace?.path ?? null,
      sessionId: app.activeSessionId ?? null,
    };
  },
  rememberContext: async (context) => {
    await api.activateWorkbench({
      id: context.workbenchId,
      projectPath: context.projectPath,
      sessionId: context.sessionId,
    });
  },
  activate: async (id) => (await api.activateWorkbench({ id })).workbench,
  commit: async (workbench) => {
    useWorkbenchStore.setState((current) => ({
      state: current.state
        ? {
            activeWorkbenchId: workbench.id,
            workbenches: current.state.workbenches.map((item) =>
              item.id === workbench.id ? workbench : item,
            ),
          }
        : { activeWorkbenchId: workbench.id, workbenches: [workbench] },
      switchingId: null,
    }));
    await restoreWorkbenchContext(workbench);
  },
});

export const useWorkbenchStore = create<WorkbenchStore>((set, get) => ({
  state: null,
  loading: false,
  switchingId: null,
  error: null,

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const state = await api.listWorkbenches();
      set({ state, loading: false });
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
    }
  },

  selectWorkbench: async (id) => {
    set({ switchingId: id, error: null });
    try {
      const committed = await selectionCoordinator.select(id);
      if (!committed && get().switchingId === id) set({ switchingId: null });
    } catch (error) {
      set({ switchingId: null, error: messageFrom(error) });
    }
  },

  createWorkbench: async (name, templateId) => {
    const result = await api.createWorkbench({ name, templateId });
    set((current) => ({
      state: current.state
        ? { ...current.state, workbenches: [...current.state.workbenches, result.workbench] }
        : { activeWorkbenchId: result.workbench.id, workbenches: [result.workbench] },
    }));
    return result.workbench;
  },

  updateWorkbench: async (id, patch) => {
    const result = await api.updateWorkbench(id, patch);
    set((current) =>
      current.state
        ? {
            state: {
              ...current.state,
              workbenches: current.state.workbenches.map((item) =>
                item.id === id ? result.workbench : item,
              ),
            },
          }
        : current,
    );
    return result.workbench;
  },

  updateDashboard: async (id, dashboardState) =>
    get().updateWorkbench(id, { dashboardState }),

  reorderWorkbenches: async (ids) => {
    const result = await api.reorderWorkbenches(ids);
    set((current) =>
      current.state
        ? { state: { ...current.state, workbenches: result.workbenches } }
        : current,
    );
  },

  deleteWorkbench: async (id) => {
    const wasActive = get().state?.activeWorkbenchId === id;
    await api.deleteWorkbench(id);
    const next = await api.listWorkbenches();
    set({ state: next });
    if (wasActive) {
      await restoreWorkbenchContext(
        next.workbenches.find((item) => item.id === next.activeWorkbenchId) ?? next.workbenches[0],
      );
    }
  },
}));

export type { WorkbenchStore };
