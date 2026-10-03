"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Drawer, Dropdown, Grid, Input, InputNumber, Radio, Select, Tag } from "antd";
import { ChevronDown, Lock } from "lucide-react";
import {
  areaAccess,
  areaPermissions,
  ORDER_STATUSES_FOR_LIMITS,
  PERMISSION_AREAS,
  PERMISSION_SECTIONS,
  relevantLimits,
  SYSTEM_ROLE_TEMPLATES,
  type AreaAccess,
  type PermissionAction,
  type PermissionArea,
  type RoleLimits,
} from "@/lib/permissions/catalog";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { saveRole } from "@/lib/queries/staff/manageRoles";
import type { RoleListItem } from "@/lib/queries/staff/types";
import { fillTemplate } from "./staffUi";

interface RoleEditorModalProps {
  open: boolean;
  /** null = new role; a role with an empty id = duplicate of that role */
  role: RoleListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const AREA_BY_KEY = new Map(PERMISSION_AREAS.map((area) => [area.key, area]));

/** An area with only one thing to allow (e.g. Reports) is just on or off. */
function isOnOffArea(area: PermissionArea): boolean {
  return area.actions.length === 1 && area.extras.length === 0;
}

/**
 * Role editor. Each area gets one access level (No access / View only / Full
 * access / Custom) so a typical role is a handful of taps; Custom reveals the
 * individual View / Add / Edit / Delete ticks. Limits only appear when the
 * permissions they constrain are on.
 */
export function RoleEditorModal({ open, role, onClose, onSaved }: RoleEditorModalProps) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();
  const screens = Grid.useBreakpoint();
  const isWide = screens.md ?? true;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [limits, setLimits] = useState<RoleLimits>({});
  // Areas the owner switched to Custom, so their ticks stay open even when
  // the ticks happen to match a preset (e.g. only View ticked).
  const [customAreas, setCustomAreas] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const isEdit = !!role?.id;
  const isNew = role === null;

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setPermissions(new Set(role?.permissions ?? []));
    setLimits(role?.limits ?? {});
    setCustomAreas(new Set());
    setTemplate("");
    setNameError(null);
  }, [open, role]);

  const L = (item: { label: string; labelBn: string }) => (lang === "bn" ? item.labelBn : item.label);

  const actionLabels: Record<PermissionAction, string> = {
    view: t.staff.colView,
    add: t.staff.colAdd,
    edit: t.staff.colEdit,
    delete: t.staff.colDelete,
  };

  const statusOptions = useMemo(() => {
    const labels: Record<string, string> = {
      pending: t.staff.orderStatusPending,
      confirmed: t.staff.orderStatusConfirmed,
      shipped: t.staff.orderStatusShipped,
      delivered: t.staff.orderStatusDelivered,
      cancelled: t.staff.orderStatusCancelled,
      returned: t.staff.orderStatusReturned,
    };
    return ORDER_STATUSES_FOR_LIMITS.map((s) => ({ value: s, label: labels[s] }));
  }, [t]);

  /* ----- changing permissions ----- */

  const setAreaAccess = (area: PermissionArea, access: AreaAccess) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      areaPermissions(area).forEach((p) => next.delete(p));
      if (access === "view") next.add(`${area.key}.view`);
      if (access === "full") areaPermissions(area).forEach((p) => next.add(p));
      if (access === "custom" && areaAccess(area, prev) === "none") next.add(`${area.key}.view`);
      if (access === "custom" && areaAccess(area, prev) !== "none") {
        areaPermissions(area).filter((p) => prev.has(p)).forEach((p) => next.add(p));
      }
      return next;
    });
    setCustomAreas((prev) => {
      const next = new Set(prev);
      if (access === "custom") next.add(area.key);
      else next.delete(area.key);
      return next;
    });
  };

  // Ticking anything also ticks View; unticking View clears the whole area.
  const toggle = (area: PermissionArea, key: string, checked: boolean) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(`${area.key}.${key}`);
        next.add(`${area.key}.view`);
      } else if (key === "view") {
        areaPermissions(area).forEach((p) => next.delete(p));
      } else {
        next.delete(`${area.key}.${key}`);
      }
      return next;
    });
  };

  const applyTemplate = (value: string) => {
    setTemplate(value);
    const tpl = SYSTEM_ROLE_TEMPLATES.find((r) => r.name === value);
    setPermissions(new Set(tpl?.permissions ?? []));
    setLimits(tpl ? { ...tpl.limits } : {});
    setCustomAreas(new Set());
  };

  const setLimit = <K extends keyof RoleLimits>(key: K, value: RoleLimits[K] | null) => {
    setLimits((prev) => {
      const next = { ...prev };
      if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  /* ----- summary ----- */

  const openAreas = PERMISSION_AREAS.filter((area) => areaAccess(area, permissions) !== "none");
  const deleteAreas = PERMISSION_AREAS.filter((area) => permissions.has(`${area.key}.delete`));
  const shownLimits = relevantLimits(permissions);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t.staff.validationRoleName);
      return;
    }
    // Drop limits for permissions the role no longer has.
    const keptLimits = Object.fromEntries(
      Object.entries(limits).filter(([key]) => shownLimits.has(key as keyof RoleLimits)),
    );
    setSaving(true);
    const result = await saveRole({
      id: isEdit ? role?.id : null,
      name,
      description,
      permissions: Array.from(permissions),
      limits: keptLimits,
    });
    setSaving(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t.staff.toastRoleSaved);
    onSaved();
  };

  /* ----- rendering ----- */

  const accessOptions = (area: PermissionArea) =>
    isOnOffArea(area)
      ? [
          { value: "none", label: t.staff.accessNone },
          { value: "view", label: t.staff.accessAllowed },
        ]
      : [
          { value: "none", label: t.staff.accessNone },
          { value: "view", label: t.staff.accessView },
          { value: "full", label: t.staff.accessFull },
          { value: "custom", label: t.staff.accessCustom },
        ];

  const renderArea = (area: PermissionArea) => {
    const computed = areaAccess(area, permissions);
    const value: AreaAccess = customAreas.has(area.key) ? "custom" : computed;
    const showTicks = value === "custom" && !isOnOffArea(area);

    return (
      <li key={area.key} className="py-3 first:pt-0 last:pb-0">
        <div className={`flex gap-3 ${isWide ? "items-center justify-between" : "flex-col"}`}>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{L(area)}</div>
            <div className="text-xs text-muted-foreground">{lang === "bn" ? area.hintBn : area.hint}</div>
          </div>
          {/* Solid buttons: the chosen level is filled, so it reads at a glance. */}
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            size="small"
            className={isWide ? "shrink-0 whitespace-nowrap" : "flex w-full [&>label]:flex-1 [&>label]:text-center"}
            value={value}
            onChange={(e) => setAreaAccess(area, e.target.value as AreaAccess)}
            options={accessOptions(area)}
          />
        </div>
        {showTicks && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 rounded-lg bg-muted/50 px-3 py-2">
            {area.actions.map((action) => (
              <Checkbox
                key={action}
                checked={permissions.has(`${area.key}.${action}`)}
                onChange={(e) => toggle(area, action, e.target.checked)}
              >
                <span className={`text-sm ${action === "delete" ? "text-red-600 dark:text-red-400" : ""}`}>
                  {actionLabels[action]}
                </span>
              </Checkbox>
            ))}
            {area.extras.map((extra) => (
              <Checkbox
                key={extra.key}
                checked={permissions.has(`${area.key}.${extra.key}`)}
                onChange={(e) => toggle(area, extra.key, e.target.checked)}
              >
                <span className="text-sm">{L(extra)}</span>
              </Checkbox>
            ))}
          </div>
        )}
      </li>
    );
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button onClick={onClose}>{t.staff.cancel}</Button>
      <Button type="primary" loading={saving} onClick={handleSave}>
        {t.staff.save}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={isWide ? 780 : "100%"}
      title={
        isEdit ? fillTemplate(t.staff.editorEditTitle, { name: role?.name ?? "" }, lang) : t.staff.editorNewTitle
      }
      footer={footer}
      destroyOnHidden
    >
      <div className="space-y-5">
        {/* Name, description, starting point */}
        <div className="grid gap-3 sm:grid-cols-2">
          {isNew && (
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-foreground">{t.staff.startFrom}</span>
              <Select
                className="w-full"
                value={template}
                onChange={applyTemplate}
                options={[
                  { value: "", label: t.staff.startBlank },
                  ...SYSTEM_ROLE_TEMPLATES.map((tpl) => ({ value: tpl.name, label: tpl.name })),
                ]}
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">{t.staff.fieldRoleName}</span>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              placeholder={t.staff.fieldRoleNamePlaceholder}
              status={nameError ? "error" : undefined}
              maxLength={60}
            />
            {nameError && <span className="text-xs text-red-500">{nameError}</span>}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">{t.staff.fieldRoleDescription}</span>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
          </label>
        </div>

        {/* What this role adds up to */}
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          {openAreas.length === 0 ? (
            <span className="text-muted-foreground">{t.staff.summaryNothing}</span>
          ) : (
            <div className="space-y-1.5">
              <div className="font-medium text-foreground">
                {fillTemplate(
                  t.staff.summaryAreas,
                  { count: openAreas.length, total: PERMISSION_AREAS.length },
                  lang,
                )}
              </div>
              {deleteAreas.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-red-600 dark:text-red-400">{t.staff.summaryDeletes}:</span>
                  {deleteAreas.map((area) => (
                    <Tag key={area.key} color="red" className="m-0">
                      {L(area)}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground m-0">{t.staff.permissionsHint}</p>

        {/* Areas, grouped */}
        {PERMISSION_SECTIONS.map((section) => {
          const areas = section.areas
            .map((key) => AREA_BY_KEY.get(key))
            .filter((area): area is PermissionArea => !!area);
          const onCount = areas.filter((area) => areaAccess(area, permissions) !== "none").length;
          const setAll = (access: AreaAccess) =>
            areas.forEach((area) =>
              setAreaAccess(area, isOnOffArea(area) && access === "full" ? "view" : access),
            );

          return (
            <section key={section.key} className="rounded-xl border border-border">
              <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <div className="min-w-0">
                  <h3 className="m-0 text-sm font-semibold text-foreground">{L(section)}</h3>
                  <span className="text-xs text-muted-foreground">
                    {fillTemplate(t.staff.sectionOnCount, { count: onCount, total: areas.length }, lang)}
                  </span>
                </div>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "none", label: t.staff.accessNone, onClick: () => setAll("none") },
                      { key: "view", label: t.staff.accessView, onClick: () => setAll("view") },
                      { key: "full", label: t.staff.accessFull, onClick: () => setAll("full") },
                    ],
                  }}
                >
                  <Button size="small">
                    {t.staff.sectionSetAll} <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Dropdown>
              </header>
              <ul className="m-0 list-none divide-y divide-border px-4 py-3">{areas.map(renderArea)}</ul>
            </section>
          );
        })}

        <div className="flex items-start gap-2 rounded-xl border border-dashed border-border px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <div className="text-sm text-foreground">{t.staff.ownerOnlyRow}</div>
            <div className="text-xs text-muted-foreground">{t.staff.ownerOnlyNote}</div>
          </div>
        </div>

        {/* Limits for the permissions that are on */}
        {shownLimits.size > 0 && (
          <section className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground m-0">{t.staff.limitsHeading}</h3>
              <p className="text-xs text-muted-foreground m-0">{t.staff.limitsHint}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {shownLimits.has("max_discount_amount") && (
                <NumberLimit
                  label={t.staff.limitMaxDiscountAmount}
                  value={limits.max_discount_amount}
                  onChange={(v) => setLimit("max_discount_amount", v)}
                />
              )}
              {shownLimits.has("max_discount_percent") && (
                <NumberLimit
                  label={t.staff.limitMaxDiscountPercent}
                  value={limits.max_discount_percent}
                  max={100}
                  onChange={(v) => setLimit("max_discount_percent", v)}
                />
              )}
              {shownLimits.has("cancel_statuses") && (
                <label className="block space-y-1">
                  <span className="text-sm text-foreground">{t.staff.limitCancelStatuses}</span>
                  <Select
                    mode="multiple"
                    className="w-full"
                    placeholder={t.staff.anyStatus}
                    options={statusOptions}
                    value={limits.cancel_statuses ?? []}
                    onChange={(v: string[]) => setLimit("cancel_statuses", v)}
                  />
                </label>
              )}
              {shownLimits.has("edit_statuses") && (
                <label className="block space-y-1">
                  <span className="text-sm text-foreground">{t.staff.limitEditStatuses}</span>
                  <Select
                    mode="multiple"
                    className="w-full"
                    placeholder={t.staff.anyStatus}
                    options={statusOptions}
                    value={limits.edit_statuses ?? []}
                    onChange={(v: string[]) => setLimit("edit_statuses", v)}
                  />
                </label>
              )}
              {shownLimits.has("delete_within_hours") && (
                <NumberLimit
                  label={t.staff.limitDeleteWithinHours}
                  value={limits.delete_within_hours}
                  onChange={(v) => setLimit("delete_within_hours", v)}
                />
              )}
              {shownLimits.has("max_stock_adjustment") && (
                <NumberLimit
                  label={t.staff.limitMaxStockAdjustment}
                  value={limits.max_stock_adjustment}
                  onChange={(v) => setLimit("max_stock_adjustment", v)}
                />
              )}
              {shownLimits.has("max_expense_amount") && (
                <NumberLimit
                  label={t.staff.limitMaxExpenseAmount}
                  value={limits.max_expense_amount}
                  onChange={(v) => setLimit("max_expense_amount", v)}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}

interface NumberLimitProps {
  label: string;
  value: number | undefined;
  max?: number;
  onChange: (value: number | null) => void;
}

function NumberLimit({ label, value, max, onChange }: NumberLimitProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-foreground">{label}</span>
      <InputNumber
        className="w-full"
        min={0}
        max={max}
        value={value ?? null}
        onChange={(v) => onChange(typeof v === "number" ? v : null)}
      />
    </label>
  );
}
