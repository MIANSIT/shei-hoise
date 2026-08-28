"use client";

import React from "react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useTranslation } from "@/lib/hook/useTranslation";

interface TopProductsProps {
  products: { name: string; revenue: number; quantity: number }[];
}

const rankStyles = [
  {
    rank: "text-amber-500 dark:text-amber-400",
    bar: "from-indigo-500 to-purple-500",
  },
  {
    rank: "text-muted-foreground",
    bar: "from-sky-500 to-cyan-400",
  },
  {
    rank: "text-orange-500 dark:text-orange-400",
    bar: "from-emerald-500 to-teal-400",
  },
];

const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  const { currency, icon, loading } = useUserCurrencyIcon();
  const n = useLocalNum();
  const t = useTranslation();

  if (loading)
    return (
      <div className="flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-border border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  if (products.length === 0)
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        {t.admin.topProductsNoData}
      </div>
    );

  const maxRevenue = Math.max(...products.map((p) => p.revenue));
  const fmt = (v: number) =>
    typeof icon === "string"
      ? `${icon} ${n(v.toFixed(2))}`
      : `${currency ?? ""} ${n(v.toFixed(2))}`;

  return (
    <div className="space-y-3">
      {products.map((p, i) => {
        const pct = maxRevenue > 0 ? (p.revenue / maxRevenue) * 100 : 0;
        const avg = p.quantity > 0 ? p.revenue / p.quantity : 0;
        const s = rankStyles[i] ?? rankStyles[2];

        return (
          <div
            key={i}
            className="rounded-xl p-4
              bg-background/70
              border border-border
              transition-colors"
          >
            {/* Rank · Name · Revenue */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-black shrink-0 ${s.rank}`}>
                  #{n(i + 1)}
                </span>
                <span className="text-sm font-semibold truncate text-foreground">
                  {p.name}
                </span>
              </div>
              <span className="text-sm font-bold shrink-0 tabular-nums text-foreground">
                {fmt(p.revenue)}
              </span>
            </div>

            {/* Units · Avg */}
            <div className="flex justify-between text-xs mb-2.5 text-muted-foreground">
              <span>{n(p.quantity)} {t.admin.topProductsUnitsSold}</span>
              <span>{fmt(avg)} {t.admin.topProductsAvgUnit}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-muted">
              <div
                className={`h-full rounded-full bg-linear-to-r ${s.bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopProducts;
