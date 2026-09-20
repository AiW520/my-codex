import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  DailyBucket,
  DailyPriority,
  DailyTask,
  ResearchSource,
  ResearchStatus,
} from "../../lib/workbench-dashboard";
import { newWorkbenchItemId, safeResearchUrl } from "../../lib/workbench-dashboard";
import {
  IconCheck,
  IconExternal,
  IconFileText,
  IconLink,
  IconListChecks,
  IconPlus,
  IconTrash,
} from "../icons";
import { Button, Input, Select, Textarea, cx } from "../ui";

export function WorkbenchMetric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="workbench-metric">
      <span className="workbench-metric-icon" aria-hidden>{icon}</span>
      <span className="workbench-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        {hint ? <span>{hint}</span> : null}
      </span>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="workbench-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={cx(value === option.value && "is-selected")}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type TaskFilter = "all" | "open" | "done";

export function TaskListEditor({
  tasks,
  onChange,
  compact = false,
  maxItems = 200,
}: {
  tasks: DailyTask[];
  onChange: (tasks: DailyTask[]) => void;
  compact?: boolean;
  maxItems?: number;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState<DailyPriority>("medium");
  const [bucket, setBucket] = useState<DailyBucket>("today");
  const [filter, setFilter] = useState<TaskFilter>("open");
  const visible = useMemo(
    () => tasks.filter((task) => filter === "all" || (filter === "done" ? task.done : !task.done)),
    [filter, tasks],
  );
  const groups: Array<{ bucket: DailyBucket; tasks: DailyTask[] }> = compact
    ? [{ bucket: "today", tasks: visible }]
    : (["today", "later"] as const).map((value) => ({
        bucket: value,
        tasks: visible.filter((task) => task.bucket === value),
      }));

  return (
    <>
      <form
        className="workbench-task-form"
        onSubmit={(event) => {
          event.preventDefault();
          const title = draft.trim();
          if (!title || tasks.length >= maxItems) return;
          onChange([
            ...tasks,
            { id: newWorkbenchItemId("task"), title, done: false, priority, bucket },
          ]);
          setDraft("");
        }}
      >
        <Input
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("workbench.daily.taskPlaceholder")}
          aria-label={t("workbench.daily.taskPlaceholder")}
        />
        {!compact ? (
          <>
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value as DailyPriority)}
              aria-label={t("workbench.daily.priority")}
            >
              <option value="high">{t("workbench.daily.priorities.high")}</option>
              <option value="medium">{t("workbench.daily.priorities.medium")}</option>
              <option value="low">{t("workbench.daily.priorities.low")}</option>
            </Select>
            <Select
              value={bucket}
              onChange={(event) => setBucket(event.target.value as DailyBucket)}
              aria-label={t("workbench.daily.bucket")}
            >
              <option value="today">{t("workbench.daily.buckets.today")}</option>
              <option value="later">{t("workbench.daily.buckets.later")}</option>
            </Select>
          </>
        ) : null}
        <Button type="submit" variant="primary" disabled={!draft.trim() || tasks.length >= maxItems}>
          <IconPlus size={15} /> {t("workbench.daily.addTask")}
        </Button>
      </form>
      <div className="workbench-list-toolbar">
        <SegmentedControl
          label={t("workbench.daily.filterLabel")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: t("workbench.daily.filters.open") },
            { value: "all", label: t("workbench.daily.filters.all") },
            { value: "done", label: t("workbench.daily.filters.done") },
          ]}
        />
        <span>{t("workbench.daily.visibleCount", { count: visible.length })}</span>
      </div>
      <div className="workbench-task-groups">
        {groups.map((group) => (
          <section className="workbench-task-group" key={group.bucket}>
            {!compact ? (
              <div className="workbench-task-group-heading">
                <span>{t(`workbench.daily.buckets.${group.bucket}`)}</span>
                <small>{group.tasks.length}</small>
              </div>
            ) : null}
            <div className="workbench-task-list" role="list">
              {group.tasks.map((task) => (
                <div className="workbench-task-row" key={task.id} role="listitem">
                  <button
                    type="button"
                    className={cx("workbench-task-check", task.done && "is-done")}
                    aria-label={task.done ? t("workbench.daily.markOpen") : t("workbench.daily.markDone")}
                    onClick={() => onChange(tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}
                  >
                    {task.done ? <IconCheck size={14} /> : null}
                  </button>
                  <span className={cx("workbench-task-title", task.done && "is-done")}>{task.title}</span>
                  {!compact ? (
                    <span className={cx("workbench-priority", `is-${task.priority}`)}>
                      {t(`workbench.daily.priorities.${task.priority}`)}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="workbench-row-delete"
                    onClick={() => onChange(tasks.filter((item) => item.id !== task.id))}
                    aria-label={t("workbench.daily.deleteTask")}
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              ))}
              {group.tasks.length === 0 ? (
                <p className="workbench-empty workbench-empty-compact">
                  <IconListChecks size={18} /> {t("workbench.daily.emptyFiltered")}
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export function NotesEditor({
  value,
  onChange,
  onCommit,
  placeholder,
  label,
  rows = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  placeholder: string;
  label: string;
  rows?: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Textarea
        className="workbench-notes"
        rows={rows}
        value={value}
        maxLength={8_000}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        placeholder={placeholder}
        aria-label={label}
      />
      <p className="workbench-save-hint"><IconFileText size={13} /> {t("workbench.savedLocally")}</p>
    </>
  );
}

export function SourceListEditor({
  sources,
  onChange,
  onOpen,
  compact = false,
  maxItems = 200,
}: {
  sources: ResearchSource[];
  onChange: (sources: ResearchSource[]) => void;
  onOpen: (url: string) => void;
  compact?: boolean;
  maxItems?: number;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [invalidUrl, setInvalidUrl] = useState(false);

  return (
    <>
      <form
        className={cx("workbench-source-form", compact && "is-compact")}
        onSubmit={(event) => {
          event.preventDefault();
          if (sources.length >= maxItems) return;
          const safeUrl = safeResearchUrl(url);
          if (!safeUrl) {
            setInvalidUrl(true);
            return;
          }
          onChange([
            ...sources,
            {
              id: newWorkbenchItemId("source"),
              title: title.trim() || safeUrl,
              url: safeUrl,
              status: "unread",
            },
          ]);
          setTitle("");
          setUrl("");
          setInvalidUrl(false);
        }}
      >
        <Input
          value={title}
          maxLength={500}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("workbench.research.sourceTitle")}
          aria-label={t("workbench.research.sourceTitle")}
        />
        <Input
          value={url}
          inputMode="url"
          maxLength={2_048}
          aria-invalid={invalidUrl}
          onChange={(event) => {
            setUrl(event.target.value);
            if (invalidUrl) setInvalidUrl(false);
          }}
          placeholder={t("workbench.research.sourceUrl")}
          aria-label={t("workbench.research.sourceUrl")}
        />
        <Button type="submit" variant="primary" disabled={!url.trim() || sources.length >= maxItems}>
          <IconPlus size={15} /> {t("workbench.research.addSource")}
        </Button>
      </form>
      {invalidUrl ? <p className="workbench-field-error" role="alert">{t("workbench.research.invalidUrl")}</p> : null}
      <div className="workbench-source-list" role="list">
        {sources.length === 0 ? (
          <p className="workbench-empty workbench-empty-compact">
            <IconLink size={18} /> {t("workbench.research.emptySources")}
          </p>
        ) : null}
        {sources.map((source) => (
          <div className="workbench-source-row" key={source.id} role="listitem">
            <div className="workbench-source-copy">
              <strong>{source.title}</strong>
              <button type="button" className="workbench-source-link" onClick={() => onOpen(source.url)}>
                <IconExternal size={12} /> {source.url}
              </button>
            </div>
            {!compact ? (
              <Select
                value={source.status}
                onChange={(event) => onChange(sources.map((item) => item.id === source.id
                  ? { ...item, status: event.target.value as ResearchStatus }
                  : item))}
                aria-label={t("workbench.research.sourceStatus", { title: source.title })}
              >
                <option value="unread">{t("workbench.research.statuses.unread")}</option>
                <option value="reading">{t("workbench.research.statuses.reading")}</option>
                <option value="reviewed">{t("workbench.research.statuses.reviewed")}</option>
              </Select>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="workbench-row-delete"
              onClick={() => onChange(sources.filter((item) => item.id !== source.id))}
              aria-label={t("workbench.research.deleteSource")}
            >
              <IconTrash size={14} />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
