"use client";

import React from "react";

interface InventoryAlertCardProps {
  title: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  color: string; // legacy: "bg-green-100" | "bg-amber-100" | "bg-red-100" | "bg-indigo-100"
  actionText?: string;
}

const colorMap: Record<
  string,
  { card: string; iconWrap: string; value: string; dot: string }
> = {
  "bg-green-100": {
    card: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
    iconWrap:
      "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-400 dark:bg-emerald-400",
  },
  "bg-amber-100": {
    card: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
    iconWrap:
      "bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400 dark:bg-amber-400",
  },
  "bg-red-100": {
    card: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
    iconWrap:
      "bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300",
    value: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-400 dark:bg-rose-400",
  },
  "bg-indigo-100": {
    card: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/25",
    iconWrap:
      "bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300",
    value: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-400 dark:bg-indigo-400",
  },
};

const InventoryAlertCard: React.FC<InventoryAlertCardProps> = ({
  title,
  value,
  icon,
  color,
}) => {
  const t = colorMap[color] ?? colorMap["bg-indigo-100"];

  return (
    <div
      className={`flex flex-col gap-3 p-4 rounded-2xl border ${t.card} transition-colors`}
    >
      {/* Icon row */}
      <div className="flex items-center justify-between">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${t.iconWrap}`}
        >
          {icon}
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      </div>

      {/* Value + title */}
      <div>
        <div
          className={`text-2xl font-black tabular-nums leading-none ${t.value}`}
        >
          {value}
        </div>
        <div className="text-[11px] font-semibold mt-1.5 leading-tight text-gray-600 dark:text-gray-300">
          {title}
        </div>
      </div>
    </div>
  );
};

export default InventoryAlertCard;
