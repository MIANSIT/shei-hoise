"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Select, Spin } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useLanguageStore } from "@/lib/store/languageStore";
import type { AccrualStatementsData } from "@/lib/hook/useAccrualStatements";
import { getAccrualProfitLoss, type AccrualProfitLoss } from "@/lib/queries/dashboard/getAccrualStatements";
import { getVendorStoreProfitForPeriod } from "@/lib/queries/vendor/getVendorStoreProfitForPeriod";
import { closeMonth } from "@/lib/queries/financial/monthClose";
import { formatMonthLabel } from "@/lib/utils/monthLabel";

/** How many finished months back the owner can close. */
const MONTHS_BACK = 12;
/** Closing more than this many days after the month ended gets a warning about the balance. */
const LATE_AFTER_DAYS = 3;

interface CloseMonthModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  /** The branch being looked at; null = the whole store. */
  branchId: string | null;
  /** The balance as it is right now: this is what gets saved as the month's balance. */
  live: AccrualStatementsData;
  /** period_end (YYYY-MM-DD) of every month that is already closed here. */
  closedEnds: ReadonlySet<string>;
  formatMoney: (amount: number) => React.ReactNode;
  onClosed: () => void;
}

/**
 * Close a finished month: save its Profit & Loss and the balance, so the business can be
 * looked at later as it stood. The Profit & Loss is worked out for the month itself; the
 * balance is saved as it is today, so closing soon after the month ends gives the closest figure.
 * Closing also locks the month in the database (see migration 20261121): entries dated in it
 * cannot be added, changed or deleted until it is reopened.
 */
export function CloseMonthModal({ open, onClose, storeId, branchId, live, closedEnds, formatMoney, onClosed }: CloseMonthModalProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const lang = useLanguageStore((s) => s.lang);
  const { success, error: showError } = useSheiNotification();

  const months = useMemo(() => {
    const list: { start: string; end: string }[] = [];
    for (let i = 1; i <= MONTHS_BACK; i += 1) {
      const m = dayjs().subtract(i, "month");
      const end = m.endOf("month").format("YYYY-MM-DD");
      if (!closedEnds.has(end)) list.push({ start: m.startOf("month").format("YYYY-MM-DD"), end });
    }
    return list;
  }, [closedEnds, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const [startKey, setStartKey] = useState<string | null>(null);
  useEffect(() => {
    if (open) setStartKey((prev) => (prev && months.some((m) => m.start === prev) ? prev : (months[0]?.start ?? null)));
  }, [open, months]);
  const month = months.find((m) => m.start === startKey) ?? null;

  const [pl, setPl] = useState<AccrualProfitLoss | null>(null);
  const [vendorProfit, setVendorProfit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !month) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setPl(null);
    Promise.all([
      getAccrualProfitLoss(storeId, month.start, month.end, branchId),
      getVendorStoreProfitForPeriod(storeId, month.start, month.end, month.start, month.end, branchId).catch(() => null),
    ])
      .then(([result, vendor]) => {
        if (cancelled) return;
        setPl(result);
        setVendorProfit(vendor?.vendor_profit ?? 0);
        setFailed(!result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, month?.start, month?.end, storeId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const daysLate = month ? dayjs().startOf("day").diff(dayjs(month.end), "day") : 0;

  const submit = async () => {
    if (!month || !pl) return;
    setSaving(true);
    try {
      const { trend: _trend, ...plWithoutTrend } = pl;
      void _trend;
      const result = await closeMonth(storeId, {
        branchId,
        periodStart: month.start,
        periodEnd: month.end,
        snapshot: { pl: plWithoutTrend, vendorProfit, balance: live.balance, vendorDue: live.vendorDue, cash: live.cash },
      });
      if (!result.success) {
        showError(result.error);
        return;
      }
      success(t.admin.mcClosedOk);
      onClosed();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      title={t.admin.mcModalTitle}
      okText={t.admin.mcConfirm}
      cancelText={t.admin.mcCancel}
      okButtonProps={{ disabled: !month || !pl || loading, loading: saving }}
      destroyOnHidden
    >
      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.admin.mcNoneLeft}</p>
      ) : (
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.mcPick}</label>
            <Select
              className="mt-1 w-full"
              value={startKey}
              onChange={setStartKey}
              options={months.map((m) => ({ value: m.start, label: formatMonthLabel(m.start, lang) }))}
            />
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Spin />
            </div>
          )}
          {failed && !loading && <Alert type="warning" showIcon message={t.admin.mcLoadFailed} />}
          {pl && !loading && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.mcWillSave}</p>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t.admin.fsNetRevenue}</span>
                <span className="font-semibold tabular-nums">{formatMoney(pl.netRevenue)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t.admin.fsNet}</span>
                <span className="font-semibold tabular-nums">{formatMoney(pl.netProfit + vendorProfit)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t.admin.mcBalanceToday}</span>
                <span className="font-semibold tabular-nums">{dayjs().format("DD-MM-YYYY")}</span>
              </div>
            </div>
          )}

          {month && daysLate > LATE_AFTER_DAYS ? (
            <Alert type="warning" showIcon message={t.admin.mcLateWarn.replace("{days}", n(String(daysLate)))} />
          ) : (
            <p className="m-0 text-xs text-muted-foreground">{t.admin.mcOnTimeNote}</p>
          )}
          <Alert type="info" showIcon message={t.admin.mcLockNote} />
        </div>
      )}
    </Modal>
  );
}
