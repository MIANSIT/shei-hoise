"use client";

import { Empty, Popconfirm } from "antd";
import { Crown, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import type { MembershipPlan } from "@/lib/queries/membership/membershipTypes";
import type { CategoryOption } from "./LevelFormModal";

interface LevelsTabProps {
  plans: readonly MembershipPlan[];
  categories: readonly CategoryOption[];
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onNew: () => void;
  onEdit: (plan: MembershipPlan) => void;
  onDelete: (plan: MembershipPlan) => Promise<void>;
  /** Gives memberships to customers who already shopped enough for an automatic level. */
  onCheckAuto: () => Promise<void>;
  checkingAuto: boolean;
}

export default function LevelsTab({
  plans,
  categories,
  canAdd,
  canEdit,
  canDelete,
  onNew,
  onEdit,
  onDelete,
  onCheckAuto,
  checkingAuto,
}: LevelsTabProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const coverage = (categoryIds: readonly string[]) =>
    categoryIds.length === 0
      ? t.admin.mbAllProducts
      : categoryIds.map((id) => categoryName.get(id) ?? "—").join(", ");

  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} aria-hidden="true" />
            {t.admin.mbNewLevel}
          </button>
          {plans.some((p) => p.minSpend !== null) && (
            <button
              type="button"
              onClick={onCheckAuto}
              disabled={checkingAuto}
              className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={checkingAuto ? "animate-spin" : ""} aria-hidden="true" />
              {t.admin.mbCheckNow}
            </button>
          )}
        </div>
      )}

      {plans.length === 0 ? (
        <Empty description={t.admin.mbEmptyLevelsTitle}>
          <p className="text-xs text-muted-foreground m-0">{t.admin.mbEmptyLevelsSub}</p>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                    <Crown size={16} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground m-0 truncate">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground m-0">{t.admin.mbMembersCount.replace("{n}", n(plan.memberCount))}</p>
                  </div>
                </div>
                {!plan.isActive && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shrink-0">
                    {t.admin.mbInactive}
                  </span>
                )}
              </div>

              {plan.minSpend !== null && (
                <p className="m-0 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {t.admin.mbAutoLine.replace("{amount}", `${symbol}${n(Math.round(plan.minSpend).toLocaleString())}`)}
                </p>
              )}

              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {plan.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground wrap-break-word">{benefit.label}</div>
                      <div className="text-xs text-muted-foreground wrap-break-word">{coverage(benefit.categoryIds)}</div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {n(benefit.discountPercent)}%
                    </span>
                  </li>
                ))}
              </ul>

              {(canEdit || canDelete) && (
                <div className="flex items-center justify-end gap-1 mt-auto">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(plan)}
                      aria-label={t.admin.mbEdit}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                  )}
                  {canDelete && (
                    <Popconfirm
                      title={t.admin.mbDeleteLevelConfirm}
                      okText={t.admin.mbDelete}
                      cancelText={t.admin.mbCancel}
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onDelete(plan)}
                    >
                      <button
                        type="button"
                        aria-label={t.admin.mbDelete}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-rose-600"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </Popconfirm>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
