"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { InputNumber, Modal, Select } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { changeProfitSharePercent } from "@/lib/queries/financial/investorMoney";
import { currentPct } from "@/lib/queries/financial/investorMath";
import type { DealPosition, PartnerPosition } from "@/lib/queries/financial/investorMoneyTypes";

export interface ChangeSharePercentTarget {
  partner: PartnerPosition;
  deal: DealPosition;
  /** YYYY-MM of the first money put in on this deal. */
  firstMonth: string | null;
  /** YYYY-MM of the latest month a share was paid for, or null. */
  lastPaidMonth: string | null;
}

interface ChangeSharePercentModalProps {
  storeId: string;
  target: ChangeSharePercentTarget | null;
  onClose: () => void;
  onDone: () => void;
}

const BOX = { width: "100%" } as const;

/**
 * Changes a profit share percent from a month on. Earlier months keep their old percent, and a month that already
 * has a share paid cannot be changed, so what was paid always matches the percent it was worked out with.
 */
export function ChangeSharePercentModal({ storeId, target, onClose, onDone }: ChangeSharePercentModalProps) {
  const t = useTranslation();
  const { success, error: showError } = useSheiNotification();
  const [pct, setPct] = useState<number | null>(null);
  const [month, setMonth] = useState<string>(dayjs().format("YYYY-MM"));
  const [saving, setSaving] = useState(false);

  // This month and the three before it; months that cannot be changed any more are switched off.
  const months = useMemo(() => [0, 1, 2, 3].map((back) => dayjs().subtract(back, "month").format("YYYY-MM")), []);

  useEffect(() => {
    if (!target) return;
    setPct(currentPct(target.deal.deal));
    setMonth(dayjs().format("YYYY-MM"));
  }, [target]);

  if (!target) return null;
  const { partner, deal } = target;

  const save = async () => {
    if (pct === null || pct <= 0) return showError(t.admin.invNeedPct);
    setSaving(true);
    try {
      const result = await changeProfitSharePercent(storeId, { dealId: deal.deal.id, pct, fromMonth: month });
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(t.admin.invPctChanged);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const label = "block text-xs font-semibold text-muted-foreground mb-1";
  return (
    <Modal
      open
      onCancel={() => !saving && onClose()}
      onOk={save}
      okText={t.admin.invSave}
      cancelText={t.admin.spCancel}
      confirmLoading={saving}
      title={t.admin.invChangePctTitle.replace("{name}", partner.partner.name)}
      destroyOnHidden
    >
      <div className="space-y-3">
        <p className="m-0 text-xs text-muted-foreground">{t.admin.invChangePctHint}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="inv-newpct" className={label}>
              {t.admin.invNewPct}
            </label>
            <InputNumber id="inv-newpct" min={0} max={100} precision={2} value={pct} onChange={(v) => setPct(v === null ? null : Number(v))} style={BOX} addonAfter="%" />
          </div>
          <div>
            <label htmlFor="inv-frommonth" className={label}>
              {t.admin.invFromMonth}
            </label>
            <Select
              id="inv-frommonth"
              style={BOX}
              value={month}
              onChange={setMonth}
              options={months.map((m) => ({
                value: m,
                label: dayjs(`${m}-01`).format("MMM YYYY"),
                disabled: (!!target.lastPaidMonth && m <= target.lastPaidMonth) || (!!target.firstMonth && m < target.firstMonth),
              }))}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
