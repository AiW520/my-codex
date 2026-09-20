import type { WorkbenchProfile } from "@pi-desktop/shared";
import { CreativeWorkbench } from "./workbenches/CreativeWorkbench";
import { DailyWorkbench } from "./workbenches/DailyWorkbench";
import { ResearchWorkbench } from "./workbenches/ResearchWorkbench";

export function WorkbenchSurface({ workbench }: { workbench: WorkbenchProfile }) {
  switch (workbench.templateId) {
    case "daily":
      return <DailyWorkbench key={workbench.id} workbench={workbench} />;
    case "creative":
      return <CreativeWorkbench key={workbench.id} workbench={workbench} />;
    case "research":
      return <ResearchWorkbench key={workbench.id} workbench={workbench} />;
    default:
      return null;
  }
}
