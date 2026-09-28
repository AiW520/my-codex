import { useTranslation } from "react-i18next";
import type { TaskStatusFilter } from "../lib/task-context";

const OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "nav.filterAll" },
  { value: "unread", label: "notifications.unread" },
  { value: "running", label: "nav.filterRunning" },
  { value: "permission", label: "nav.filterPermission" },
  { value: "completed", label: "nav.filterCompleted" },
  { value: "failed", label: "nav.filterFailed" },
];

export function TaskStatusFilterControl({ value, onChange }: {
  value: TaskStatusFilter;
  onChange: (value: TaskStatusFilter) => void;
}) {
  const { t } = useTranslation();
  return <label className="sidebar-task-filter">
    <span>{t("nav.filterSessions")}</span>
    <select className="sidebar-status-filter" value={value} onChange={(event) => {
      const option = OPTIONS.find((item) => item.value === event.target.value);
      if (option) onChange(option.value);
    }}>
      {OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
    </select>
  </label>;
}
