import type { WorkbenchProfile } from "@pi-desktop/shared";
import {
  IconBookOpen,
  IconCalendar,
  IconCode,
  IconPalette,
} from "./icons";

export function WorkbenchIcon({
  profile,
  size = 15,
}: {
  profile: Pick<WorkbenchProfile, "templateId">;
  size?: number;
}) {
  switch (profile.templateId) {
    case "daily":
      return <IconCalendar size={size} />;
    case "creative":
      return <IconPalette size={size} />;
    case "research":
      return <IconBookOpen size={size} />;
    case "coding":
    case "custom":
    default:
      return <IconCode size={size} />;
  }
}
