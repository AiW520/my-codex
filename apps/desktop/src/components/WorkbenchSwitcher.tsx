import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  WorkbenchProfile,
  WorkbenchTemplateId,
  WorkbenchUpdate,
} from "@pi-desktop/shared";
import { useWorkbenchStore } from "../stores/workbench-store";
import { useArmedDelete } from "../hooks/use-armed-delete";
import { Button, Input, Select, TooltipButton, cx } from "./ui";
import {
  IconChevronDown,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "./icons";
import { WorkbenchIcon } from "./WorkbenchIcon";

const WORKBENCH_THEMES = [
  "polar-night",
  "sakura-day",
  "fortune-gold",
  "deep-study",
] as const;

export function WorkbenchSwitcher() {
  const { t } = useTranslation();
  const state = useWorkbenchStore((store) => store.state);
  const switchingId = useWorkbenchStore((store) => store.switchingId);
  const error = useWorkbenchStore((store) => store.error);
  const createWorkbench = useWorkbenchStore((store) => store.createWorkbench);
  const updateWorkbench = useWorkbenchStore((store) => store.updateWorkbench);
  const reorderWorkbenches = useWorkbenchStore((store) => store.reorderWorkbenches);
  const deleteWorkbench = useWorkbenchStore((store) => store.deleteWorkbench);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<WorkbenchTemplateId>("custom");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { armed: armedDelete, setArmed: setArmedDelete } = useArmedDelete();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!state) return null;
  const active = state.workbenches.find((item) => item.id === state.activeWorkbenchId);
  if (!active) return null;

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await createWorkbench(trimmed, template);
      setName("");
      setTemplate("custom");
      setCreating(false);
      await useWorkbenchStore.getState().selectWorkbench(created.id);
    } catch (error) {
      useWorkbenchStore.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  const saveRename = async (profile: WorkbenchProfile) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === profile.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateWorkbench(profile.id, { name: trimmed });
      setEditingId(null);
    } catch (error) {
      useWorkbenchStore.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  const move = async (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= state.workbenches.length) return;
    const ids = state.workbenches.map((item) => item.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    try {
      await reorderWorkbenches(ids);
    } catch (error) {
      useWorkbenchStore.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  const requestDelete = async (profile: WorkbenchProfile) => {
    if (armedDelete !== profile.id) {
      setArmedDelete(profile.id);
      return;
    }
    setArmedDelete(null);
    try {
      await deleteWorkbench(profile.id);
    } catch (error) {
      useWorkbenchStore.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  const saveAppearance = async (patch: WorkbenchUpdate) => {
    try {
      await updateWorkbench(active.id, patch);
    } catch (error) {
      useWorkbenchStore.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div ref={rootRef} className="workbench-switcher-anchor">
      <button
        type="button"
        className={cx("workbench-switcher-trigger", open && "is-open")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("workbench.switcherLabel")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="workbench-switcher-icon" aria-hidden>
          <WorkbenchIcon profile={active} />
        </span>
        <span className="workbench-switcher-name">{active.name}</span>
        <IconChevronDown size={14} aria-hidden />
      </button>

      {open ? (
            <div className="workbench-switcher-menu" role="menu">
              <div className="workbench-menu-heading">
                <span>{t("workbench.switcherTitle")}</span>
                <TooltipButton
                  type="button"
                  className="workbench-menu-close"
                  tooltip={t("common.close")}
                  ariaLabel={t("common.close")}
                  onClick={() => setOpen(false)}
                >
                  <IconX size={15} />
                </TooltipButton>
              </div>
              <div className="workbench-menu-list">
                {state.workbenches.map((profile, index) => (
                  <div
                    key={profile.id}
                    className={cx(
                      "workbench-menu-item",
                      profile.id === state.activeWorkbenchId && "is-active",
                      switchingId === profile.id && "is-switching",
                    )}
                  >
                    {editingId === profile.id ? (
                      <div className="workbench-menu-select">
                        <WorkbenchIcon profile={profile} />
                        <Input
                          className="workbench-menu-rename"
                          value={editingName}
                          maxLength={48}
                          autoFocus
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveRename(profile);
                            }
                            if (event.key === "Escape") {
                              event.stopPropagation();
                              setEditingId(null);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="workbench-menu-select"
                        role="menuitemradio"
                        aria-checked={profile.id === state.activeWorkbenchId}
                        disabled={Boolean(switchingId)}
                        onClick={() => void useWorkbenchStore.getState().selectWorkbench(profile.id)}
                      >
                        <WorkbenchIcon profile={profile} />
                        <span className="workbench-menu-label">{profile.name}</span>
                      </button>
                    )}
                    <div className="workbench-menu-actions">
                      <TooltipButton
                        type="button"
                        className="workbench-menu-action"
                        tooltip={t("workbench.rename")}
                        ariaLabel={t("workbench.rename")}
                        onClick={() => {
                          setEditingId(profile.id);
                          setEditingName(profile.name);
                        }}
                      >
                        <IconPencil size={13} />
                      </TooltipButton>
                      <TooltipButton
                        type="button"
                        className="workbench-menu-action"
                        tooltip={t("workbench.moveUp")}
                        ariaLabel={t("workbench.moveUp")}
                        disabled={index === 0}
                        onClick={() => void move(index, -1)}
                      >
                        <IconGripVertical size={13} />
                      </TooltipButton>
                      <TooltipButton
                        type="button"
                        className={cx("workbench-menu-action danger", armedDelete === profile.id && "is-armed")}
                        tooltip={armedDelete === profile.id ? t("workbench.deleteConfirm", { name: profile.name }) : t("workbench.delete")}
                        ariaLabel={armedDelete === profile.id ? t("workbench.deleteConfirm", { name: profile.name }) : t("workbench.delete")}
                        disabled={state.workbenches.length <= 1}
                        onClick={() => void requestDelete(profile)}
                      >
                        <IconTrash size={13} />
                      </TooltipButton>
                    </div>
                  </div>
                ))}
              </div>

              <div className="workbench-appearance">
                <div className="workbench-appearance-heading">{t("workbench.appearance")}</div>
                <label className="workbench-appearance-field">
                  <span>{t("workbench.theme")}</span>
                  <Select
                    value={active.themeId ?? ""}
                    aria-label={t("workbench.theme")}
                    onChange={(event) =>
                      void saveAppearance({ themeId: event.target.value || null })
                    }
                  >
                    <option value="">{t("workbench.followGlobalTheme")}</option>
                    {WORKBENCH_THEMES.map((theme) => (
                      <option value={theme} key={theme}>{t(`workbench.themes.${theme}`)}</option>
                    ))}
                  </Select>
                </label>
                <label className="workbench-appearance-toggle">
                  <input
                    type="checkbox"
                    checked={active.motionEnabled}
                    onChange={(event) =>
                      void saveAppearance({ motionEnabled: event.target.checked })
                    }
                  />
                  <span>{t("workbench.motion")}</span>
                </label>
                <label className="workbench-appearance-slider">
                  <span>{t("workbench.motionIntensity")}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={active.motionIntensity}
                    disabled={!active.motionEnabled}
                    onChange={(event) =>
                      void saveAppearance({ motionIntensity: Number(event.target.value) })
                    }
                  />
                  <output>{active.motionIntensity}%</output>
                </label>
                <label className="workbench-appearance-slider">
                  <span>{t("workbench.wallpaperOpacity")}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={active.wallpaperOpacity}
                    onChange={(event) =>
                      void saveAppearance({ wallpaperOpacity: Number(event.target.value) })
                    }
                  />
                  <output>{active.wallpaperOpacity}%</output>
                </label>
              </div>

              {creating ? (
                <form
                  className="workbench-create-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitCreate();
                  }}
                >
                  <Input
                    value={name}
                    maxLength={48}
                    placeholder={t("workbench.namePlaceholder")}
                    aria-label={t("workbench.nameLabel")}
                    onChange={(event) => setName(event.target.value)}
                    autoFocus
                  />
                  <Select
                    value={template}
                    aria-label={t("workbench.templateLabel")}
                    onChange={(event) => setTemplate(event.target.value as WorkbenchTemplateId)}
                  >
                    {(["coding", "daily", "creative", "research", "custom"] as const).map((value) => (
                      <option value={value} key={value}>{t(`workbench.templates.${value}`)}</option>
                    ))}
                  </Select>
                  <div className="workbench-create-actions">
                    <Button type="submit" variant="primary" size="sm" disabled={!name.trim()}>
                      <IconPlus size={14} /> {t("workbench.create")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  type="button"
                  className="workbench-create-button"
                  variant="ghost"
                  onClick={() => setCreating(true)}
                >
                  <IconPlus size={14} /> {t("workbench.new")}
                </Button>
              )}
              {error ? (
                <p className="workbench-menu-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
    </div>
  );
}
