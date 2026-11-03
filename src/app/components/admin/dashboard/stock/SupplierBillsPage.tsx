"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Button, Empty, Spin } from "antd";
import { ReceiptText } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getSupplierBills, type SupplierBillRow } from "@/lib/queries/supplier/supplierBills";
import type { BillSummary } from "@/lib/queries/supplier/supplierBillMath";
import { addSupplierEntry } from "@/lib/queries/supplier/supplierLedger";
import { SupplierEntryModal, type SupplierEntryValues } from "./SupplierMoneyModals";

type Filter = "all" | "open" | "overdue" | "paid";

/**
 * Supplier bills: every bill with what is paid and what is left, the total
 * owed (Accounts payable), what is overdue or due soon, and how old it is.
 * Payments are applied to a supplier's oldest bill first.
 */
export default function SupplierBillsPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { can } = usePermissions();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = (amount: number) => `${symbol}${n(Math.round(amount).toLocaleString())}`;
  const { success, error: showError } = useSheiNotification();
  const allowed = can("stock.supplier_money");

  const [rows, setRows] = useState<SupplierBillRow[]>([]);
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [payTarget, setPayTarget] = useState<SupplierBillRow | null>(null);
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    const result = await getSupplierBills(storeId);
    if (!result.success) {
      showError(result.error || t.admin.sbLoadFailed);
      setLoading(false);
      return;
    }
    setRows(result.rows);
    setSummary(result.summary);
    setLoading(false);
  }, [storeId, showError, t.admin.sbLoadFailed]);

  useEffect(() => {
    if (allowed) void load();
    else if (!userLoading) setLoading(false);
  }, [allowed, load, userLoading]);

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        filter === "all" ? true : filter === "paid" ? r.status === "paid" : filter === "overdue" ? r.overdue : r.status !== "paid",
      ),
    [rows, filter],
  );

  const submitPayment = async (values: SupplierEntryValues) => {
    if (!storeId || !payTarget) return;
    setPaySaving(true);
    try {
      const result = await addSupplierEntry(storeId, {
        supplierId: payTarget.supplierId,
        kind: "payment",
        amount: values.amount,
        date: values.date,
        paymentMethod: values.paymentMethod,
        paidFrom: values.paidFrom,
        funderId: values.funderId,
        funderTreatment: values.funderTreatment,
        branchId: values.branchId,
        note: values.note,
      });
      if (!result.success) {
        showError(result.error ?? t.admin.spFailed);
        return;
      }
      success(t.admin.slSaved);
      setPayTarget(null);
      await load();
    } finally {
      setPaySaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }
  if (!allowed) return <div className="p-6 text-sm text-muted-foreground">{t.admin.sbNoAccess}</div>;

  const date = (iso: string | null) => (iso ? n(dayjs(iso).format("DD-MM-YYYY")) : "—");
  const statusLabel = { paid: t.admin.sbStatusPaid, part: t.admin.sbStatusPart, unpaid: t.admin.sbStatusUnpaid };
  const statusClass = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    part: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    unpaid: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
  };

  const tile = (label: string, value: number, hint: string, tone: "normal" | "bad" = "normal") => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1 ${tone === "bad" && value > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{money(value)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );

  const filters: { key: Filter; label: string }[] = [
    { key: "open", label: t.admin.sbFilterOpen },
    { key: "overdue", label: t.admin.sbFilterOverdue },
    { key: "paid", label: t.admin.sbFilterPaid },
    { key: "all", label: t.admin.sbFilterAll },
  ];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <ReceiptText size={20} aria-hidden="true" />
            {t.admin.sbTitle}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">{t.admin.sbSub}</p>
        </div>
        <Link href="/dashboard/stock/receive">
          <Button type="primary">{t.admin.sbGoReceive}</Button>
        </Link>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tile(t.admin.sbPayable, summary.payable, t.admin.sbPayableHint.replace("{count}", n(summary.openBills)))}
            {tile(t.admin.sbOverdue, summary.overdue, t.admin.sbOverdueHint, "bad")}
            {tile(t.admin.sbDueSoon, summary.dueSoon, t.admin.sbDueSoonHint)}
            {tile(t.admin.sbAdvance, summary.advance, t.admin.sbAdvanceHint)}
          </div>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground">{t.admin.sbAging}</h2>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { label: t.admin.sbAge0, value: summary.aging.upTo30 },
                { label: t.admin.sbAge31, value: summary.aging.from31To60 },
                { label: t.admin.sbAge61, value: summary.aging.over60 },
              ].map((b) => (
                <div key={b.label}>
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className="text-base font-bold tabular-nums text-foreground">{money(b.value)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div role="group" aria-label={t.admin.sbFilterLabel} className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-8">
            <Empty description={rows.length === 0 ? t.admin.sbEmpty : t.admin.sbEmptyFilter} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-205">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="py-2 px-3 font-semibold">{t.admin.sbColDate}</th>
                  <th className="py-2 px-3 font-semibold">{t.admin.sbColSupplier}</th>
                  <th className="py-2 px-3 font-semibold">{t.admin.sbColBill}</th>
                  <th className="py-2 px-3 font-semibold">{t.admin.sbColDue}</th>
                  <th className="py-2 px-3 font-semibold text-right">{t.admin.sbColAmount}</th>
                  <th className="py-2 px-3 font-semibold text-right">{t.admin.sbColPaid}</th>
                  <th className="py-2 px-3 font-semibold text-right">{t.admin.sbColLeft}</th>
                  <th className="py-2 px-3 font-semibold">{t.admin.sbColStatus}</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="py-2 px-3 whitespace-nowrap text-foreground">{date(r.date)}</td>
                    <td className="py-2 px-3 text-foreground">{r.supplierName}</td>
                    <td className="py-2 px-3 text-foreground">
                      {r.billNo ?? "—"}
                      {r.legacy && <span className="block text-xs text-muted-foreground">{t.admin.sbLegacy}</span>}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-foreground">{date(r.dueDate)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-foreground">{money(r.amount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{money(r.paid)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-foreground">{money(r.left)}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass[r.status]}`}>{statusLabel[r.status]}</span>
                      {r.overdue && (
                        <span className="ml-1 inline-block rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
                          {t.admin.sbOverdueTag}
                        </span>
                      )}
                      {r.left > 0 && <span className="block text-xs text-muted-foreground mt-0.5">{t.admin.sbDays.replace("{n}", n(r.ageDays))}</span>}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {r.left > 0 && (
                        <Button size="small" onClick={() => setPayTarget(r)}>
                          {t.admin.sbPay}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">{t.admin.sbFifoNote}</p>

      <SupplierEntryModal
        open={!!payTarget}
        kind="payment"
        supplierName={payTarget?.supplierName ?? ""}
        defaultAmount={payTarget?.left ?? null}
        saving={paySaving}
        onSubmit={submitPayment}
        onCancel={() => setPayTarget(null)}
      />
    </div>
  );
}
