"use client";

import React from "react";

interface OrderStatusCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
}

const styleMap: Record<string, { text: string; bg: string }> = {
  "text-amber-700": {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50  dark:bg-amber-500/10  border-amber-200  dark:border-amber-500/25",
  },
  "text-blue-700": {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50   dark:bg-blue-500/10   border-blue-200   dark:border-blue-500/25",
  },
  "text-purple-700": {
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25",
  },
  "text-green-700": {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
  },
  "text-red-700": {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50   dark:bg-rose-500/10   border-rose-200   dark:border-rose-500/25",
  },
};

const fallback = {
  text: "text-gray-700 dark:text-gray-300",
  bg: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
};

const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
  title,
  value,
  icon,
  textColor,
}) => {
  const s = styleMap[textColor] ?? fallback;
  return (
    <div
      className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border transition-colors ${s.bg}`}
    >
      <div className="flex items-center gap-2">
        <span className={s.text}>{icon}</span>
        <span className={`text-xs sm:text-sm font-semibold ${s.text}`}>
          {title}
        </span>
      </div>
      <span className={`text-lg sm:text-xl font-black tabular-nums ${s.text}`}>
        {value}
      </span>
    </div>
  );
};

export default OrderStatusCard;
