"use client";

import { useEffect, useState } from "react";
import { Spin } from "antd";
import { Building2 } from "lucide-react";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { getBranchComparison, type BranchComparisonRow } from "@/lib/queries/dashboard/getBranchComparison";

interface BranchComparisonProps {
  storeId: string;
  periodStart: string;
  periodEnd: string;
  /** Currency symbol, e.g. "৳". */
  currency: string;
}

type Totals = Omit<BranchComparisonRow, "branchId" | "name" | "isActive">;

const ZERO: Totals = {
  orders: 0,
  sales: 0,
  received: 0,
  grossProfit: 0,
  expenses: 0,
  vendorProfit: 0,
  net: 0,
  customerDue: 0,
  codPending: 0,
};

/**
 * Every branch side by side, with the brand total underneath (stores with
 * branches, "All branches" selected). Tapping a branch opens its dashboard.
 */
export function BranchComparison({ storeId, periodStart, periodEnd, currency }: BranchComparisonProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { setSelectedBranchId } = useBranches();
  const [rows, setRows] = useState<BranchComparisonRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setFailed(false);
    getBranchComparison(storeId, periodStart, periodEnd)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((err) => {
        console.error("Branch comparison failed:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, periodStart, periodEnd]);

  if (failed) return null;

  const money = (v: number) => `${currency}${n(Math.round(v).toLocaleString("en-IN"))}`;
  const totals = (rows ?? []).reduce<Totals>(
    (acc, r) => ({
      orders: acc.orders + r.orders,
      sales: acc.sales + r.sales,
      received: acc.received + r.received,
      grossProfit: acc.grossProfit + r.grossProfit,
      expenses: acc.expenses + r.expenses,
      vendorProfit: acc.vendorProfit + r.vendorProfit,
      net: acc.net + r.net,
      customerDue: acc.customerDue + r.customerDue,
      codPending: acc.codPending + r.codPending,
    }),
    ZERO,
  );

  const columns: { key: keyof Totals; label: string; money: boolean }[] = [
    { key: "orders", label: t.branches.cmpOrders, money: false },
    { key: "sales", label: t.branches.cmpSales, money: true },
    { key: "received", label: t.admin.psReceived, money: true },
    { key: "grossProfit", label: t.branches.cmpGrossProfit, money: true },
    { key: "expenses", label: t.branches.cmpExpenses, money: true },
    { key: "net", label: t.branches.cmpNet, money: true },
    { key: "customerDue", label: t.branches.cmpCustomerDue, money: true },
    { key: "codPending", label: t.branches.cmpCodPending, money: true },
  ];
  const cell = (row: Totals, key: keyof Totals, isMoney: boolean) => {
    const value = row[key];
    const text = isMoney ? money(value) : n(value);
    const negative = key === "net" && value < 0;
    return <span className={negative ? "text-rose-600 dark:text-rose-400" : undefined}>{text}</span>;
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground m-0">{t.branches.cmpTitle}</h2>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">· {t.branches.cmpHint}</span>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-6">
          <Spin size="small" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full min-w-170 text-sm tabular-nums">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-semibold px-3 py-2">{t.branches.cmpBranch}</th>
                {columns.map((c) => (
                  <th key={c.key} className="text-right font-semibold px-3 py-2 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.branchId}
                  className="border-t border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedBranchId(r.branchId)}
                  title={t.branches.cmpOpenBranch}
                >
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                    {r.name}
                    {!r.isActive && <span className="ml-1 text-[11px] text-muted-foreground">({t.branches.inactiveShort})</span>}
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="text-right px-3 py-2 whitespace-nowrap">
                      {cell(r, c.key, c.money)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-foreground">
                <td className="px-3 py-2 whitespace-nowrap">{t.branches.cmpBrandTotal}</td>
                {columns.map((c) => (
                  <td key={c.key} className="text-right px-3 py-2 whitespace-nowrap">
                    {cell(totals, c.key, c.money)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
