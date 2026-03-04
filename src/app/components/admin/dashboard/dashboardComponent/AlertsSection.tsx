"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { StockFilter } from "@/lib/types/enums";

interface AlertsSectionProps {
  alerts: {
    type: "stock" | "order" | "payment" | "expense";
    message: string;
    count: number;
  }[];
}

const alertMeta = {
  stock: {
    icon: "📦",
    row: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
    text: "text-amber-700 dark:text-amber-300",
    btn: "border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20",
    sub: "text-amber-600/70 dark:text-amber-400/60",
  },
  order: {
    icon: "🛒",
    row: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
    text: "text-rose-700 dark:text-rose-300",
    btn: "border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20",
    sub: "text-rose-600/70 dark:text-rose-400/60",
  },
  payment: {
    icon: "💳",
    row: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25",
    text: "text-violet-700 dark:text-violet-300",
    btn: "border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20",
    sub: "text-violet-600/70 dark:text-violet-400/60",
  },
  expense: {
    icon: "💸",
    row: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
    text: "text-rose-700 dark:text-rose-300",
    btn: "border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20",
    sub: "text-rose-600/70 dark:text-rose-400/60",
  },
};

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  const router = useRouter();

  const handleAction = (alert: { type: string; message: string }) => {
    if (alert.type === "stock") {
      router.push(
        `/dashboard/products/stocks-update?filter=${
          alert.message.toLowerCase().includes("low")
            ? StockFilter.LOW
            : StockFilter.OUT
        }`,
      );
    } else if (alert.type === "order") {
      router.push(
        alert.message.toLowerCase().includes("pending")
          ? "/dashboard/orders?status=pending"
          : "/dashboard/orders",
      );
    } else if (alert.type === "payment") {
      router.push(
        alert.message.toLowerCase().includes("pending")
          ? "/dashboard/orders?category=payment&payment_status=pending"
          : "/dashboard/orders",
      );
    } else if (alert.type === "expense") {
      router.push("/dashboard/expense");
    }
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const m = alertMeta[alert.type] ?? alertMeta.order;
        return (
          <div
            key={i}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${m.row}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base shrink-0">{m.icon}</span>
              <div className="min-w-0">
                <div className={`text-sm font-bold truncate ${m.text}`}>
                  {alert.message}
                </div>
                <div className={`text-[10px] mt-0.5 ${m.sub}`}>
                  {alert.count} item{alert.count !== 1 ? "s" : ""} affected
                </div>
              </div>
            </div>
            <button
              onClick={() => handleAction(alert)}
              className={`shrink-0 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${m.btn}`}
            >
              Fix →
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AlertsSection;
