"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Button } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { getAccrualProfitLoss } from "@/lib/queries/dashboard/getAccrualStatements";
import { getVendorStoreProfitForPeriod } from "@/lib/queries/vendor/getVendorStoreProfitForPeriod";
import { profitShareDue } from "@/lib/queries/financial/investorMath";
import type { InvestorEntry, InvestorOverview } from "@/lib/queries/financial/investorMoneyTypes";
import type { InvestorPayTarget } from "./InvestorPayModal";

interface ProfitShareCardProps {
  storeId: string;
  overview: InvestorOverview;
  money: (amount: number) => string;
  onPay: (target: InvestorPayTarget) => void;
}

/** The three months shown: this one so far, and the two before it. */
function recentMonths(): { month: string; start: string; end: string }[] {
  const today = dayjs();
  return [0, 1, 2].map((back) => {
    const first = today.subtract(back, "month").startOf("month");
    const last = back === 0 ? today : first.endOf("month");
    return { month: first.format("YYYY-MM"), start: first.format("YYYY-MM-DD"), end: last.format("YYYY-MM-DD") };
  });
}

/**
 * Profit shares by month: each person's percent of the month's profit (the same profit the Sales tab shows),
 * what has been paid, and what is left. Paying it asks which pocket pays; profit does not change.
 */
export function ProfitShareCard({ storeId, overview, money, onPay }: ProfitShareCardProps) {
  const t = useTranslation();
  const months = useMemo(() => recentMonths(), []);
  const [profits, setProfits] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      months.map(async (m) => {
        const [pl, vendor] = await Promise.all([
          getAccrualProfitLoss(storeId, m.start, m.end, null),
          getVendorStoreProfitForPeriod(storeId, m.start, m.end, m.start, m.end, null),
        ]);
        return [m.month, (pl?.netProfit ?? 0) + (vendor.vendor_profit ?? 0)] as const;
      }),
    )
      .then((rows) => {
        if (cancelled) return;
        setProfits(Object.fromEntries(rows));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, months]);

  const shareDeals = overview.positions.partners.flatMap((p) => p.deals.filter((d) => d.deal.kind === "profit_share").map((d) => ({ partner: p, deal: d })));
  if (shareDeals.length === 0) return null;

  const firstPutIn = (dealId: string): string | null => {
    const dates = overview.entries.filter((e: InvestorEntry) => e.dealId === dealId && e.type === "put_in").map((e) => e.date);
    return dates.length === 0 ? null : dates.reduce((min, d) => (d < min ? d : min)).slice(0, 7);
  };
  const paidFor = (dealId: string, month: string): number =>
    overview.entries.filter((e) => e.dealId === dealId && e.type === "profit_share_paid" && e.periodMonth === month).reduce((s, e) => s + e.amount, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="m-0 text-base font-bold text-foreground">{t.admin.invShareTitle}</h2>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">{t.admin.invShareSub}</p>
      <ul className="m-0 list-none divide-y divide-border p-0">
        {shareDeals.map(({ partner, deal }) =>
          months.map((m) => {
            const profit = profits[m.month] ?? 0;
            const due = profitShareDue(deal.deal.profitSharePct ?? 0, profit, m.month, firstPutIn(deal.deal.id));
            const paid = paidFor(deal.deal.id, m.month);
            const remaining = Math.max(Math.round((due - paid) * 100) / 100, 0);
            return (
              <li key={`${deal.deal.id}-${m.month}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-foreground">
                    {partner.partner.name} · {deal.deal.profitSharePct}% · {dayjs(`${m.month}-01`).format("MMM YYYY")}
                  </p>
                  <p className="m-0 text-xs text-muted-foreground">
                    {loaded
                      ? t.admin.invShareLine
                          .replace("{profit}", money(profit))
                          .replace("{due}", money(due))
                          .replace("{paid}", money(paid))
                      : t.admin.acLoading}
                  </p>
                </div>
                <Button size="small" disabled={!loaded || remaining <= 0} onClick={() => onPay({ mode: "share", partner, deal, month: m.month, due: remaining })}>
                  {remaining > 0 ? t.admin.invPayShare.replace("{amount}", money(remaining)) : t.admin.invSharePaid}
                </Button>
              </li>
            );
          }),
        )}
      </ul>
    </section>
  );
}
