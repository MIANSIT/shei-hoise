"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Select, Spin, Tag } from "antd";
import { Building2 } from "lucide-react";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  getOrderBranchOptions,
  moveOrderToBranch,
  type OrderBranchInfo,
} from "@/lib/queries/orders/orderBranch";

interface OrderBranchPanelProps {
  orderId: string;
  /** Called after the branch changed or was confirmed, so the list can refresh. */
  onChanged?: () => void;
}

type LoadedInfo = Extract<OrderBranchInfo, { ok: true }>;

/**
 * Which branch fulfils an order, and moving it to another one (stores with
 * branches). Branches that have every item are listed first; the others say
 * what they're missing.
 */
export function OrderBranchPanel({ orderId, onChanged }: OrderBranchPanelProps) {
  const t = useTranslation();
  const notify = useSheiNotification();
  const { enabled } = useBranches();
  const { can } = usePermissions();
  const [info, setInfo] = useState<LoadedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getOrderBranchOptions(orderId);
    if (result.ok) {
      setInfo(result);
      setTarget(result.branchId ?? result.options.find((o) => o.canFulfil)?.branchId);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (!enabled) return null;
  if (loading && !info) {
    return (
      <div className="flex justify-center py-2">
        <Spin size="small" />
      </div>
    );
  }
  if (!info) return null;

  const current = info.options.find((o) => o.isCurrent);
  const canMove = info.canMove && can("orders.move_branch");
  const moving = target && target !== info.branchId;

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    const result = await moveOrderToBranch(orderId, target);
    setSaving(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(moving ? t.branches.toastOrderMoved : t.branches.toastOrderConfirmed);
    await load();
    onChanged?.();
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">{t.branches.orderBranch}:</span>
        <span className="font-semibold text-foreground">{current?.name ?? t.branches.noBranchYet}</span>
        {!info.confirmed && <Tag color="gold" className="m-0">{t.branches.waitingConfirm}</Tag>}
        {info.needsTransfer && <Tag color="red" className="m-0">{t.branches.needsTransfer}</Tag>}
      </div>

      {canMove && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            className="w-full sm:w-72"
            value={target}
            onChange={setTarget}
            aria-label={t.branches.orderBranch}
            popupMatchSelectWidth={false}
            styles={{ popup: { root: { minWidth: 280, maxWidth: "min(420px, calc(100vw - 32px))" } } }}
            options={info.options.map((o) => ({
              value: o.branchId,
              label: (
                <div className="flex flex-col leading-snug py-0.5" style={{ whiteSpace: "normal" }}>
                  <span className="font-medium">
                    {o.name}
                    {o.isCurrent ? ` · ${t.branches.currentBranch}` : ""}
                  </span>
                  {o.canFulfil ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{t.branches.hasEverything}</span>
                  ) : (
                    <span className="text-[11px] text-red-600 dark:text-red-400 break-words">
                      {t.branches.missingLabel}:
                      {o.missing.map((m) => (
                        <span key={m} className="block pl-2">
                          • {m}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ),
            }))}
            optionLabelProp="value"
            labelRender={({ value }) => info.options.find((o) => o.branchId === value)?.name ?? ""}
          />
          {(moving || !info.confirmed) && (
            <Button type="primary" loading={saving} onClick={submit}>
              {moving ? t.branches.moveOrder : t.branches.confirmBranch}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
