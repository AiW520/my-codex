import { useCallback } from "react";
import type { WorkbenchProfile } from "@pi-desktop/shared";
import { useAppStore } from "../../stores/app-store";
import { useWorkbenchStore } from "../../stores/workbench-store";

export function useWorkbenchDashboard(workbench: WorkbenchProfile) {
  const updateDashboard = useWorkbenchStore((store) => store.updateDashboard);
  const showToast = useAppStore((store) => store.showToast);

  return useCallback(async (patch: Record<string, unknown>) => {
    const current = useWorkbenchStore
      .getState()
      .state?.workbenches.find((item) => item.id === workbench.id);
    try {
      await updateDashboard(workbench.id, {
        ...(current?.dashboardState ?? workbench.dashboardState),
        ...patch,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), { variant: "error" });
    }
  }, [showToast, updateDashboard, workbench.dashboardState, workbench.id]);
}
