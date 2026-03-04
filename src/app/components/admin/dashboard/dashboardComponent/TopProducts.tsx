"use client";

import React from "react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface TopProductsProps {
  products: { name: string; revenue: number; quantity: number }[];
}

const rankStyles = [
  {
    rank: "text-amber-500 dark:text-amber-400",
    bar: "from-indigo-500 to-purple-500",
  },
  {
    rank: "text-slate-500  dark:text-slate-300",
    bar: "from-sky-500 to-cyan-400",
  },
  {
    rank: "text-orange-500 dark:text-orange-400",
    bar: "from-emerald-500 to-teal-400",
  },
];

const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  const { currency, icon, loading } = useUserCurrencyIcon();

  if (loading)
    return (
      <div className="flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  if (products.length === 0)
    return (
      <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
        No sales data for this period
      </div>
    );

  const maxRevenue = Math.max(...products.map((p) => p.revenue));
  const fmt = (v: number) =>
    typeof icon === "string"
      ? `${icon} ${v.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${currency ?? ""} ${v.toFixed(2)}`;

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
              bg-gray-50 dark:bg-gray-800/70
              border border-gray-200 dark:border-gray-700
              transition-colors"
          >
            {/* Rank · Name · Revenue */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-black shrink-0 ${s.rank}`}>
                  #{i + 1}
                </span>
                <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-100">
                  {p.name}
                </span>
              </div>
              <span className="text-sm font-bold shrink-0 tabular-nums text-gray-900 dark:text-white">
                {fmt(p.revenue)}
              </span>
            </div>

            {/* Units · Avg */}
            <div className="flex justify-between text-xs mb-2.5 text-gray-500 dark:text-gray-400">
              <span>{p.quantity} units sold</span>
              <span>{fmt(avg)} avg / unit</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
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
