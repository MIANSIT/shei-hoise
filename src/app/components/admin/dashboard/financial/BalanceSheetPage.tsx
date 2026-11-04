"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, DatePicker, Popconfirm, Segmented, Select, Spin } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Lock, Printer } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useAccrualStatements, type AccrualStatementsData } from "@/lib/hook/useAccrualStatements";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useLanguageStore } from "@/lib/store/languageStore";
import { getMonthCloses, reopenMonth } from "@/lib/queries/financial/monthClose";
import { getBalanceOnDate } from "@/lib/queries/financial/balanceHistory";
import type { BalanceOnDateResult, EstimatedBalance } from "@/lib/queries/financial/balanceHistoryTypes";
import { estimateBalanceOnDate } from "@/lib/queries/financial/estimateBalance";
import { useRecordDailyBalance } from "@/lib/hook/useRecordDailyBalance";
import type { MonthClose } from "@/lib/queries/financial/monthCloseTypes";
import { formatMonthLabel } from "@/lib/utils/monthLabel";
import { CloseMonthModal } from "./CloseMonthModal";
import { getDashboardPeriodRange } from "@/lib/utils/dashboardPeriods";
import { getVendorStoreProfitForPeriod } from "@/lib/queries/vendor/getVendorStoreProfitForPeriod";
import type { TimePeriod } from "@/lib/hook/useDashboardMetrics";
import { FinancialStatements } from "@/app/components/admin/dashboard/dashboardComponent/FinancialStatements";

/**
 * The financial statements on their own page, every line explained. The
 * Balance Sheet (what the business owns and owes today) opens first and does not
 * depend on a period; the Profit & Loss tab uses the period picked here. The
 * header's branch choice decides whether it is one branch or the whole store.
 * A month the owner has closed can be opened from "Show": its saved copy never changes.
 */
export default function BalanceSheetPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { currency, icon: CurrencyIcon } = useUserCurrencyIcon();
  const { enabled: branchesOn, loading: branchesLoading, selectedBranchId, selectedBranch } = useBranches();
  const { isOwner } = usePermissions();
  const branchId = branchesOn ? selectedBranchId : null;
  const lang = useLanguageStore((s) => s.lang);
  const { success, error: showError } = useSheiNotification();

  // Closed months for this store or branch, and which one is on screen ("live" = today).
  const [closes, setCloses] = useState<MonthClose[]>([]);
  const [asOf, setAsOf] = useState<string>("live");
  const [closeOpen, setCloseOpen] = useState(false);
  const loadCloses = useCallback(async () => {
    if (!storeId) return;
    const result = await getMonthCloses(storeId, branchId);
    setCloses(result.success ? result.closes : []);
  }, [storeId, branchId]);
  useEffect(() => {
    if (branchesLoading) return;
    void loadCloses();
  }, [loadCloses, branchesLoading]);
  // A choice that no longer exists (another branch, or the month was reopened) goes back to today.
  useEffect(() => {
    if (asOf !== "live" && asOf !== "date" && !closes.some((c) => c.id === asOf)) setAsOf("live");
  }, [closes, asOf]);
  const selectedClose = closes.find((c) => c.id === asOf) ?? null;

  // A saved day: the balance copy taken that day (kept from the day the history started).
  const [historyDate, setHistoryDate] = useState<Dayjs | null>(null);
  const [history, setHistory] = useState<BalanceOnDateResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const onSavedDate = asOf === "date";
  // A day with no saved copy can be estimated from dated records (never exact).
  const [estimate, setEstimate] = useState<EstimatedBalance | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateFailed, setEstimateFailed] = useState(false);
  useEffect(() => {
    setEstimate(null);
    setEstimateFailed(false);
  }, [historyDate, branchId, asOf]);
  const runEstimate = async () => {
    if (!storeId || !historyDate) return;
    setEstimating(true);
    setEstimateFailed(false);
    try {
      const result = await estimateBalanceOnDate(storeId, branchId, historyDate.format("YYYY-MM-DD"), isOwner, branchesOn);
      setEstimate(result);
      setEstimateFailed(!result);
    } finally {
      setEstimating(false);
    }
  };
  useEffect(() => {
    if (!onSavedDate || !historyDate || !storeId || branchesLoading) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    getBalanceOnDate(storeId, branchId, historyDate.format("YYYY-MM-DD"))
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onSavedDate, historyDate, storeId, branchId, branchesLoading]);

  // The Profit & Loss period: a quick choice (7 days, 30 days, 1 year, all time) or any dates picked by hand.
  const [preset, setPreset] = useState<TimePeriod | "custom">("monthly");
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(29, "day"), dayjs()]);
  const presetRange = getDashboardPeriodRange(preset === "custom" ? "monthly" : preset);
  const range = {
    periodStart: preset === "custom" ? customRange[0].format("YYYY-MM-DD") : presetRange.periodStart,
    periodEnd: preset === "custom" ? customRange[1].format("YYYY-MM-DD") : presetRange.periodEnd,
  };
  const { data, ready, error } = useAccrualStatements({
    storeId,
    branchId,
    periodStart: range.periodStart,
    periodEnd: range.periodEnd,
    prevPeriodStart: range.periodStart,
    prevPeriodEnd: range.periodEnd,
    compare: false,
    enabled: !!storeId && !branchesLoading,
    includeCash: isOwner,
    withBranches: branchesOn,
  });

  // Margin made on vendor sales is part of net profit, so the Profit & Loss tab needs it for the same period.
  const [vendorProfit, setVendorProfit] = useState(0);
  useEffect(() => {
    if (!storeId || branchesLoading) return;
    let cancelled = false;
    getVendorStoreProfitForPeriod(storeId, range.periodStart, range.periodEnd, range.periodStart, range.periodEnd, branchId)
      .then((result) => {
        if (!cancelled) setVendorProfit(result.vendor_profit);
      })
      .catch(() => {
        if (!cancelled) setVendorProfit(0);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, branchId, branchesLoading, range.periodStart, range.periodEnd]);

  const periodLabel =
    preset === "weekly"
      ? t.admin.periodLast7
      : preset === "monthly"
        ? t.admin.periodLast30
        : preset === "yearly"
          ? t.admin.periodLast365
          : preset === "all"
            ? t.admin.periodAllTime
            : `${customRange[0].format("DD-MM-YYYY")} – ${customRange[1].format("DD-MM-YYYY")}`;

  const formatMoney = (amount: number) => {
    if (!currency) return n(amount.toFixed(2));
    if (typeof CurrencyIcon === "string") return `${CurrencyIcon} ${n(amount.toFixed(2))}`;
    if (CurrencyIcon)
      return (
        <>
          {CurrencyIcon} {n(amount.toFixed(2))}
        </>
      );
    return n(amount.toFixed(2));
  };

  // What the statements show: the saved copy of a closed month, or today's figures.
  const savedDay = onSavedDate && history?.success ? history.found : null;
  const shown: AccrualStatementsData | null = onSavedDate
    ? savedDay && data
      ? { pl: data.pl, prevPl: null, balance: savedDay.balance, vendorDue: savedDay.vendorDue, cash: savedDay.cash }
      : estimate && data
        ? { pl: data.pl, prevPl: null, balance: estimate.balance, vendorDue: estimate.vendorDue, cash: estimate.cash }
        : null
    : selectedClose
    ? {
        pl: { ...selectedClose.snapshot.pl, otherIncome: selectedClose.snapshot.pl.otherIncome ?? 0, trend: [] },
        prevPl: null,
        balance: selectedClose.snapshot.balance,
        vendorDue: selectedClose.snapshot.vendorDue,
        cash: selectedClose.snapshot.cash,
      }
    : data;
  const shownVendorProfit = selectedClose && !onSavedDate ? selectedClose.snapshot.vendorProfit : vendorProfit;
  const shownPeriodLabel = selectedClose && !onSavedDate ? formatMonthLabel(selectedClose.periodEnd, lang) : periodLabel;

  const handleReopen = async () => {
    if (!storeId || !selectedClose) return;
    const result = await reopenMonth(storeId, selectedClose.id);
    if (!result.success) {
      showError(result.error);
      return;
    }
    success(t.admin.mcReopenedOk);
    setAsOf("live");
    await loadCloses();
  };

  // The owner's visits keep the balance history going (today's copy, at most hourly), on the live view only.
  useRecordDailyBalance({ storeId, branchId, data, enabled: isOwner && asOf === "live" });

  if (userLoading || branchesLoading || !ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.admin.menuBalanceSheet}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.admin.bsSubtitle}
            {branchesOn ? ` · ${selectedBranch?.name ?? t.branches.allBranches}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{t.admin.mcShow}</span>
            <Select
              value={asOf}
              onChange={setAsOf}
              style={{ minWidth: 220 }}
              options={[
                { value: "live", label: t.admin.mcLive },
                { value: "date", label: t.admin.bhPickDate },
                ...closes.map((c) => ({ value: c.id, label: t.admin.mcEndOf.replace("{month}", formatMonthLabel(c.periodEnd, lang)) })),
              ]}
            />
          </div>
          {onSavedDate && (
            <DatePicker
              format="DD-MM-YYYY"
              value={historyDate}
              onChange={(d) => setHistoryDate(d)}
              placeholder={t.admin.bhDatePh}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
          )}
          {isOwner && data && (
            <Button icon={<Lock size={14} />} onClick={() => setCloseOpen(true)} className="flex items-center gap-2">
              {t.admin.mcCloseBtn}
            </Button>
          )}
          <Segmented
            disabled={!!selectedClose && !onSavedDate}
            value={preset}
            onChange={(v) => setPreset(v as TimePeriod | "custom")}
            options={[
              { label: t.admin.period7D, value: "weekly" },
              { label: t.admin.period30D, value: "monthly" },
              { label: t.admin.period1Y, value: "yearly" },
              { label: t.admin.periodAll, value: "all" },
              { label: t.admin.bsCustom, value: "custom" },
            ]}
            aria-label={t.admin.bsPeriodNote}
          />
          <DatePicker.RangePicker
            format="DD-MM-YYYY"
            allowClear={false}
            disabled={!!selectedClose && !onSavedDate}
            value={[dayjs(range.periodStart), dayjs(range.periodEnd)]}
            onChange={(v) => {
              if (v && v[0] && v[1]) {
                setCustomRange([v[0], v[1]]);
                setPreset("custom");
              }
            }}
            disabledDate={(d) => d.isAfter(dayjs(), "day")}
          />
          <Button icon={<Printer size={14} />} onClick={() => window.print()} className="flex items-center gap-2">
            {t.admin.bsPrint}
          </Button>
        </div>
      </div>

      {onSavedDate && (
        <div className="space-y-2">
          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Spin />
            </div>
          ) : !historyDate ? (
            <Alert type="info" showIcon message={t.admin.bhChoose} />
          ) : history && !history.success ? (
            <Alert type="warning" showIcon message={history.error} />
          ) : savedDay ? (
            <Alert
              type="success"
              showIcon
              message={t.admin.bhSavedBanner.replace("{date}", dayjs(savedDay.date).format("DD-MM-YYYY")).replace("{time}", dayjs(savedDay.savedAt).format("HH:mm"))}
            />
          ) : history?.success ? (
            <Alert
              type="warning"
              showIcon
              message={t.admin.bhNone.replace("{date}", historyDate.format("DD-MM-YYYY"))}
              description={
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {history.earlier || history.later ? <span>{t.admin.bhNearest}</span> : <span>{t.admin.bhNoHistory}</span>}
                  {history.earlier && (
                    <Button size="small" onClick={() => setHistoryDate(dayjs(history.earlier))}>
                      {dayjs(history.earlier).format("DD-MM-YYYY")}
                    </Button>
                  )}
                  {history.later && (
                    <Button size="small" onClick={() => setHistoryDate(dayjs(history.later))}>
                      {dayjs(history.later).format("DD-MM-YYYY")}
                    </Button>
                  )}
                  {historyDate.isBefore(dayjs(), "day") && (
                    <Button size="small" type="primary" loading={estimating} onClick={() => void runEstimate()}>
                      {t.admin.beShow}
                    </Button>
                  )}
                </div>
              }
            />
          ) : null}
          {!savedDay && estimate && (
            <Alert
              type={estimate.fromHistory ? "info" : "warning"}
              showIcon
              message={(estimate.fromHistory ? t.admin.beExactBanner : t.admin.beBanner).replace("{date}", dayjs(estimate.date).format("DD-MM-YYYY"))}
              description={estimate.fromHistory ? t.admin.beExactNote : t.admin.beCaveats}
            />
          )}
          {!savedDay && estimateFailed && !estimating && <Alert type="error" showIcon message={t.admin.beFailed} />}
        </div>
      )}

      {selectedClose && !onSavedDate && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-300 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100">
          <p className="m-0">
            {t.admin.mcSavedBanner
              .replace("{month}", formatMonthLabel(selectedClose.periodEnd, lang))
              .replace("{date}", dayjs(selectedClose.closedAt).format("DD-MM-YYYY HH:mm"))}
          </p>
          {isOwner && (
            <Popconfirm title={t.admin.mcReopenConfirm} okText={t.admin.mcReopen} cancelText={t.admin.mcCancel} onConfirm={handleReopen}>
              <Button size="small" className="print:hidden">
                {t.admin.mcReopen}
              </Button>
            </Popconfirm>
          )}
        </div>
      )}

      {onSavedDate && !shown ? null : shown ? (
        <FinancialStatements
          data={shown}
          initialTab="balance"
          branchId={branchId}
          periodLabel={shownPeriodLabel}
          vendorProfit={shownVendorProfit}
          formatMoney={formatMoney}
          canSetUpCash={isOwner}
        />
      ) : (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {t.admin.bsLoadFailed}
          {error && process.env.NODE_ENV !== "production" ? ` ${error}` : ""}
        </div>
      )}

      {data && storeId && (
        <CloseMonthModal
          open={closeOpen}
          onClose={() => setCloseOpen(false)}
          storeId={storeId}
          branchId={branchId}
          live={data}
          closedEnds={new Set(closes.map((c) => c.periodEnd))}
          formatMoney={formatMoney}
          onClosed={() => void loadCloses()}
        />
      )}
    </div>
  );
}
