"use client";

import React from "react";
import { useTranslation } from "@/lib/hook/useTranslation";
import OrderAmountCard from "./OrderAmountCard";

// ─── Section Header ───────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{
  title: string;
  sub?: string;
  accentClass?: string;
}> = ({ title, sub, accentClass = "bg-indigo-500" }) => (
  <div className="flex items-center gap-3 mb-3 sm:mb-4">
    <div className={`w-0.5 h-5 rounded-full shrink-0 ${accentClass}`} />
    <div>
      <h3
        className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em]
        text-primary "
      >
        {title}
      </h3>
      {sub && (
        <p className="text-[9px] sm:text-[10px] mt-0.5 text-primary ">{sub}</p>
      )}
    </div>
  </div>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`rounded-2xl bg-card
    border border-border
    shadow-sm dark:shadow-none ${className}`}
  >
    {children}
  </div>
);

// ─── Order Status Row ─────────────────────────────────────────────────────────
const statusConfig: Record<string, { text: string; bg: string; dot: string }> =
  {
    Pending: {
      text: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
      dot: "bg-amber-400",
    },
    Confirmed: {
      text: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25",
      dot: "bg-blue-400",
    },
    Shipped: {
      text: "text-violet-700 dark:text-violet-300",
      bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25",
      dot: "bg-violet-400",
    },
    Delivered: {
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
      dot: "bg-emerald-400",
    },
    Cancelled: {
      text: "text-rose-700 dark:text-rose-300",
      bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
      dot: "bg-rose-400",
    },
  };

const OrderStatusRow: React.FC<{ title: string; value: string }> = ({
  title,
  value,
}) => {
  const t = useTranslation();
  const translatedToKey: Record<string, string> = {
    [t.admin.pending]: "Pending",
    [t.admin.confirmed]: "Confirmed",
    [t.admin.shipped]: "Shipped",
    [t.admin.delivered]: "Delivered",
    [t.admin.cancelled]: "Cancelled",
  };
  const configKey = translatedToKey[title] ?? title;
  const cfg = statusConfig[configKey] ?? {
    text: "text-muted-foreground",
    bg: "bg-background border-border",
    dot: "bg-gray-400",
  };
  return (
    <div
      className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border transition-colors ${cfg.bg}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className={`text-xs sm:text-sm font-semibold ${cfg.text}`}>
          {title}
        </span>
      </div>
      <span
        className={`text-xl sm:text-2xl font-black tabular-nums ${cfg.text}`}
      >
        {value}
      </span>
    </div>
  );
};


export interface OrderStatusCardData {
  title: string;
  value: string;
}

export interface OrderAmountData {
  title: string;
  amount: number;
  status?: "paid" | "pending" | "refunded";
}

/** The order pipeline (counts by status) and payment flow (what is paid, pending and refunded), all time. */
export function OrderFlowBlocks({
  orderStatusCards,
  orderAmounts,
}: {
  orderStatusCards: readonly OrderStatusCardData[];
  orderAmounts: readonly OrderAmountData[];
}) {
  const t = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div>
        <SectionHeader title={t.admin.orderPipeline} sub={t.admin.allTimeStatus} accentClass="bg-amber-500" />
        <Card className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
          {orderStatusCards.map((c, i) => (
            <OrderStatusRow key={i} title={c.title} value={c.value} />
          ))}
        </Card>
      </div>
      <div>
        <SectionHeader title={t.admin.paymentFlow} sub={t.admin.allTimeFinancial} accentClass="bg-emerald-500" />
        <Card className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
          {orderAmounts.map((c, i) => (
            <OrderAmountCard key={i} title={c.title} amount={c.amount} status={c.status} />
          ))}
        </Card>
      </div>
    </div>
  );
}
