"use client";

import { useEffect, useRef, useState } from "react";
import { Input, InputNumber, Modal, Select, Switch } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import type { MembershipPlan, MembershipPlanInput } from "@/lib/queries/membership/membershipTypes";

export interface CategoryOption {
  id: string;
  name: string;
}

interface LevelFormModalProps {
  open: boolean;
  /** The level being changed, or null to create a new one. */
  editing: MembershipPlan | null;
  categories: readonly CategoryOption[];
  saving: boolean;
  onSubmit: (values: MembershipPlanInput) => void;
  onCancel: () => void;
}

interface BenefitRowState {
  key: number;
  label: string;
  percent: number | null;
  categoryIds: string[];
}

/** Create or change a membership level: its name and its discount rows. */
export default function LevelFormModal({ open, editing, categories, saving, onSubmit, onCancel }: LevelFormModalProps) {
  const t = useTranslation();
  const { error: showError } = useSheiNotification();
  const nextKey = useRef(0);
  const blankRow = (): BenefitRowState => ({ key: nextKey.current++, label: "", percent: null, categoryIds: [] });

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Whether this level is earned by spending. Off = a special level only given by hand.
  const [autoOn, setAutoOn] = useState(false);
  const [minSpend, setMinSpend] = useState<number | null>(null);
  const [prefix, setPrefix] = useState("");
  const [rows, setRows] = useState<BenefitRowState[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setIsActive(editing.isActive);
      setAutoOn(editing.minSpend !== null);
      setMinSpend(editing.minSpend);
      setPrefix(editing.numberPrefix ?? "");
      setRows(
        editing.benefits.map((b) => ({
          key: nextKey.current++,
          label: b.label,
          percent: b.discountPercent,
          categoryIds: [...b.categoryIds],
        })),
      );
    } else {
      setName("");
      setIsActive(true);
      setAutoOn(false);
      setMinSpend(null);
      setPrefix("");
      setRows([blankRow()]);
    }
  }, [open, editing]);

  const updateRow = (key: number, patch: Partial<BenefitRowState>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = () => {
    if (!name.trim()) return showError(t.admin.mbNameRequired);
    if (rows.length === 0) return showError(t.admin.mbNeedRow);
    if (autoOn && !minSpend) return showError(t.admin.mbAutoSpendRequired);
    if (autoOn && !prefix.trim()) return showError(t.admin.mbAutoPrefixRequired);
    onSubmit({
      name: name.trim(),
      isActive,
      // A level that is not automatic keeps no target, so it is only ever given by hand.
      minSpend: autoOn ? (minSpend ?? null) : null,
      numberPrefix: autoOn ? prefix.trim() || null : null,
      benefits: rows.map((r) => ({ label: r.label.trim(), discountPercent: r.percent ?? 0, categoryIds: r.categoryIds })),
    });
  };

  const labelClass = "block text-xs font-semibold text-muted-foreground";

  return (
    <Modal
      open={open}
      onCancel={saving ? undefined : onCancel}
      onOk={submit}
      okText={t.admin.mbSave}
      cancelText={t.admin.mbCancel}
      confirmLoading={saving}
      title={editing ? t.admin.mbLevelEditTitle : t.admin.mbLevelNewTitle}
      width={640}
      destroyOnHidden
    >
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="mb-level-name" className={labelClass}>{t.admin.mbFieldLevelName}</label>
            <Input
              id="mb-level-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.admin.mbLevelNamePlaceholder}
              maxLength={60}
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground h-8">
            <Switch checked={isActive} onChange={setIsActive} />
            {t.admin.mbLevelActive}
          </label>
        </div>

        <div className="rounded-xl border border-border p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">{t.admin.mbAutoTitle}</div>
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                {autoOn ? t.admin.mbAutoHint : t.admin.mbManualOnlyHint}
              </p>
            </div>
            <Switch checked={autoOn} onChange={setAutoOn} aria-label={t.admin.mbAutoTitle} />
          </div>
          {autoOn && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mb-auto-spend" className={labelClass}>{t.admin.mbAutoSpend}</label>
                  <InputNumber
                    id="mb-auto-spend"
                    value={minSpend}
                    onChange={(value) => setMinSpend(value === null ? null : Number(value))}
                    min={1}
                    precision={0}
                    style={{ width: "100%" }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="mb-auto-prefix" className={labelClass}>{t.admin.mbAutoPrefix}</label>
                  <Input
                    id="mb-auto-prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="PAW-126"
                    maxLength={30}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="m-0 text-[11px] text-muted-foreground">{t.admin.mbAutoPrefixHint}</p>
            </>
          )}
        </div>

        <div>
          <div className="text-sm font-bold text-foreground">{t.admin.mbBenefitsTitle}</div>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">{t.admin.mbBenefitsHint}</p>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-xl border border-border p-3 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <div>
                <label htmlFor={`mb-label-${row.key}`} className={labelClass}>{t.admin.mbBenefitLabel}</label>
                <Input
                  id={`mb-label-${row.key}`}
                  value={row.label}
                  onChange={(e) => updateRow(row.key, { label: e.target.value })}
                  placeholder={t.admin.mbBenefitLabelPlaceholder}
                  maxLength={120}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor={`mb-percent-${row.key}`} className={labelClass}>{t.admin.mbBenefitPercent}</label>
                <InputNumber
                  id={`mb-percent-${row.key}`}
                  value={row.percent}
                  onChange={(value) => updateRow(row.key, { percent: value === null ? null : Number(value) })}
                  min={0.01}
                  max={100}
                  precision={2}
                  style={{ width: "100%" }}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`mb-cats-${row.key}`} className={labelClass}>{t.admin.mbBenefitCategories}</label>
                <Select
                  id={`mb-cats-${row.key}`}
                  mode="multiple"
                  value={row.categoryIds}
                  onChange={(ids) => updateRow(row.key, { categoryIds: ids })}
                  placeholder={t.admin.mbAllProducts}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  showSearch={{ optionFilterProp: "label" }}
                  className="w-full mt-1"
                />
              </div>
              {rows.length > 1 && (
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                    aria-label={`${t.admin.mbRemoveRow} ${index + 1}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    {t.admin.mbRemoveRow}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, blankRow()])}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
        >
          <Plus size={14} aria-hidden="true" />
          {t.admin.mbAddRow}
        </button>
      </div>
    </Modal>
  );
}
