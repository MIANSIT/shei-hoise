"use client";

import React from "react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface OrderAmountCardProps {
  title: string;
  amount: number;
  status?: "paid" | "pending" | "refunded";
}

const cfg = {
  paid: {
    row: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
    label: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-700 dark:text-emerald-300",
    amount: "text-emerald-700 dark:text-emerald-200",
    meta: "text-emerald-500/80 dark:text-emerald-400/70",
    icon: "✓",
    badge: "COLLECTED",
  },
  pending: {
    row: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
    label: "text-amber-600 dark:text-amber-400",
    title: "text-amber-700 dark:text-amber-300",
    amount: "text-amber-700 dark:text-amber-200",
    meta: "text-amber-500/80 dark:text-amber-400/70",
    icon: "◎",
    badge: "AWAITING",
  },
  refunded: {
    row: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
    label: "text-rose-600 dark:text-rose-400",
    title: "text-rose-700 dark:text-rose-300",
    amount: "text-rose-700 dark:text-rose-200",
    meta: "text-rose-500/80 dark:text-rose-400/70",
    icon: "↩",
    badge: "RETURNED",
  },
};

const OrderAmountCard: React.FC<OrderAmountCardProps> = ({
  title,
  amount,
  status = "pending",
}) => {
  const { icon: currencyIcon, loading } = useUserCurrencyIcon();
  const sym = loading
    ? "৳"
    : typeof currencyIcon === "string"
      ? currencyIcon
      : "৳";

  const c = cfg[status];

  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${c.row} transition-colors`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`text-base font-black leading-none ${c.label}`}>
          {c.icon}
        </span>
        <div>
          <div
            className={`text-[10px] font-black uppercase tracking-widest ${c.meta}`}
          >
            {c.badge}
          </div>
          <div className={`text-sm font-bold ${c.title}`}>{title}</div>
        </div>
      </div>
      <div className={`text-lg font-black tabular-nums ${c.amount}`}>
        {sym}
        {amount.toLocaleString()}
      </div>
    </div>
  );
};

export default OrderAmountCard;
