"use client";

import { useState } from "react";
import { App, Button, Input, Spin, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ArrowDown, ArrowUp, Building2, MapPin, Pencil, Phone, Power, Trash2 } from "lucide-react";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { MenuLabel } from "@/app/components/admin/common/MenuLabel";
import { BranchFormModal } from "@/app/components/admin/branches/BranchFormModal";
import { BranchAssignmentSetting } from "@/app/components/admin/branches/BranchAssignmentSetting";
import { fillTemplate } from "@/app/components/admin/staff/staffUi";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  deleteBranch,
  enableBranches,
  reorderBranches,
  setBranchActive,
} from "@/lib/queries/branches/manageBranches";
import type { BranchItem } from "@/lib/queries/branches/types";

/** Owner-only: the store's branches, their priority, and turning branches on. */
export default function BranchesPage() {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const n = useLocalNum();
  const notify = useSheiNotification();
  const { modal } = App.useApp();
  const { loading, setup, refresh } = useBranches();

  const [firstName, setFirstName] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading && !setup) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  if (!setup?.featureEnabled) return <FeatureLocked title={<MenuLabel labelKey="menuBranches" />} />;

  const header = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
        <Building2 size={20} color="white" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-foreground m-0">
          <MenuLabel labelKey="menuBranches" />
        </h1>
        <p className="text-xs text-muted-foreground m-0">{t.branches.pageSubtitle}</p>
      </div>
    </div>
  );

  /* ----- Branches not turned on yet ----- */
  if (!setup.branchesOn) {
    const handleEnable = async () => {
      setEnabling(true);
      const result = await enableBranches({ name: firstName.trim() || t.branches.defaultFirstName });
      setEnabling(false);
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(t.branches.toastEnabled);
      await refresh();
    };

    return (
      <div className="px-4 sm:px-8 py-5 space-y-5">
        {header}
        <div className="max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground m-0">{t.branches.enableTitle}</h2>
          <ul className="m-0 pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>{t.branches.enablePoint1}</li>
            <li>{t.branches.enablePoint2}</li>
            <li>{t.branches.enablePoint3}</li>
          </ul>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">{t.branches.firstBranchName}</span>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t.branches.defaultFirstName}
              maxLength={60}
              className="max-w-sm"
            />
          </label>
          <Button type="primary" loading={enabling} onClick={handleEnable}>
            {t.branches.enableButton}
          </Button>
        </div>
      </div>
    );
  }

  /* ----- Branch list ----- */
  const branches = setup.branches;
  const unlimited = setup.maxBranches === -1;
  const atLimit = !unlimited && branches.length >= setup.maxBranches;

  const run = async (id: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) => {
    setBusyId(id);
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(success);
    await refresh();
  };

  const move = (index: number, direction: -1 | 1) => {
    const ids = branches.map((b) => b.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(branches[index].id, () => reorderBranches(ids), t.branches.toastReordered);
  };

  const confirmDelete = (branch: BranchItem) =>
    modal.confirm({
      title: fillTemplate(t.branches.confirmDeleteTitle, { name: branch.name }, lang),
      content: t.branches.confirmDeleteBody,
      okText: t.branches.delete,
      cancelText: t.branches.cancel,
      okButtonProps: { danger: true },
      onOk: () => run(branch.id, () => deleteBranch(branch.id), t.branches.toastDeleted),
    });

  const confirmDeactivate = (branch: BranchItem) =>
    modal.confirm({
      title: fillTemplate(t.branches.confirmDeactivateTitle, { name: branch.name }, lang),
      content: t.branches.confirmDeactivateBody,
      okText: t.branches.deactivate,
      cancelText: t.branches.cancel,
      onOk: () => run(branch.id, () => setBranchActive(branch.id, false), t.branches.toastDeactivated),
    });

  return (
    <div className="px-4 sm:px-8 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {header}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {unlimited
              ? fillTemplate(t.branches.usageUnlimited, { count: branches.length }, lang)
              : fillTemplate(t.branches.usageLimited, { count: branches.length, limit: setup.maxBranches }, lang)}
          </span>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={atLimit}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t.branches.addBranch}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground m-0 max-w-[72ch]">{t.branches.priorityHint}</p>

      <ol className="m-0 p-0 list-none space-y-3">
        {branches.map((branch, index) => (
          <li
            key={branch.id}
            className={`rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
              branch.isActive ? "" : "opacity-70"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="shrink-0 inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-500/15 px-2 text-sm font-bold text-teal-700 dark:text-teal-300">
                #{n(branch.priority)}
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-foreground">{branch.name}</span>
                  {branch.code && <Tag className="m-0">{branch.code}</Tag>}
                  {branch.priority === 1 && branch.isActive && (
                    <Tag color="cyan" className="m-0">
                      {t.branches.defaultBadge}
                    </Tag>
                  )}
                  {!branch.isActive && <Tag className="m-0">{t.branches.inactive}</Tag>}
                </div>
                {(branch.address || branch.phone) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {branch.address && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {branch.address}
                      </span>
                    )}
                    {branch.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {branch.phone}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {fillTemplate(t.branches.unitsLine, { units: branch.unitsInStock, reserved: branch.unitsReserved }, lang)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="small"
                icon={<ArrowUp className="h-3.5 w-3.5" />}
                disabled={index === 0 || busyId !== null}
                onClick={() => move(index, -1)}
                aria-label={t.branches.moveUp}
                title={t.branches.moveUp}
              />
              <Button
                size="small"
                icon={<ArrowDown className="h-3.5 w-3.5" />}
                disabled={index === branches.length - 1 || busyId !== null}
                onClick={() => move(index, 1)}
                aria-label={t.branches.moveDown}
                title={t.branches.moveDown}
              />
              <Button
                size="small"
                icon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditing(branch);
                  setFormOpen(true);
                }}
              >
                {t.branches.edit}
              </Button>
              <Button
                size="small"
                icon={<Power className="h-3.5 w-3.5" />}
                loading={busyId === branch.id}
                onClick={() =>
                  branch.isActive
                    ? confirmDeactivate(branch)
                    : run(branch.id, () => setBranchActive(branch.id, true), t.branches.toastActivated)
                }
              >
                {branch.isActive ? t.branches.deactivate : t.branches.activate}
              </Button>
              <Button
                size="small"
                danger
                icon={<Trash2 className="h-3.5 w-3.5" />}
                disabled={branches.length <= 1}
                onClick={() => confirmDelete(branch)}
                aria-label={t.branches.delete}
                title={t.branches.delete}
              />
            </div>
          </li>
        ))}
      </ol>

      <BranchAssignmentSetting />

      <BranchFormModal open={formOpen} branch={editing} onClose={() => setFormOpen(false)} onSaved={refresh} />
    </div>
  );
}
