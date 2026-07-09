"use client";

import React from "react";
import { Package, Wallet, AlertTriangle, XCircle } from "lucide-react";
import type { StockAggregateStats } from "@/lib/queries/products/getProductWithStock";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface StockStatsProps {
  stats: StockAggregateStats | null;
  loading?: boolean;
  currencySymbol: string;
}

const StockStats: React.FC<StockStatsProps> = ({
  stats,
  loading = false,
  currencySymbol,
}) => {
  const n = useLocalNum();

  const tiles = [
    {
      key: "products",
      icon: Package,
      label: "Products",
      value: stats ? n(stats.productsCount) : "—",
      hint: stats ? `${n(stats.trackedSkuCount)} tracked SKUs` : "",
      tone: "neutral" as const,
    },
    {
      key: "value",
      icon: Wallet,
      label: "Stock value (TP)",
      value: stats
        ? `${currencySymbol}${n(Math.round(stats.stockValueTp).toLocaleString())}`
        : "—",
      hint: "at trade price · cost basis",
      tone: "value" as const,
    },
    {
      key: "low",
      icon: AlertTriangle,
      label: "Low stock",
      value: stats ? n(stats.counts.low) : "—",
      hint: "at or below threshold",
      tone: "warning" as const,
    },
    {
      key: "out",
      icon: XCircle,
      label: "Out of stock",
      value: stats ? n(stats.counts.out) : "—",
      hint: "needs restock",
      tone: "danger" as const,
    },
  ];

  const toneClasses: Record<string, { icon: string; value: string }> = {
    neutral: {
      icon: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      value: "text-gray-900 dark:text-gray-100",
    },
    value: {
      icon: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
      value: "text-gray-900 dark:text-gray-100",
    },
    warning: {
      icon: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
      value: "text-amber-600 dark:text-amber-400",
    },
    danger: {
      icon: "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400",
      value: "text-red-500 dark:text-red-400",
    },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {tiles.map(({ key, icon: Icon, label, value, hint, tone }) => (
        <div
          key={key}
          className="flex items-start gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3.5 py-3"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone].icon}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {label}
            </p>
            <p
              className={`mt-0.5 text-lg font-extrabold tracking-tight tabular-nums ${
                loading ? "animate-pulse text-gray-300 dark:text-gray-700" : toneClasses[tone].value
              }`}
            >
              {value}
            </p>
            {hint && (
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                {hint}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StockStats;
