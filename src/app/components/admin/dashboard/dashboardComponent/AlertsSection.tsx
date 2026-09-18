"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { StockFilter } from "@/lib/types/enums";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import InventoryAlertCard from "./InventoryAlertCard";

interface AlertsSectionProps {
  alerts: {
    type: "stock" | "order" | "payment" | "expense";
    message: string;
    count: number;
  }[];
}

const alertMeta = {
  stock: { icon: "📦", color: "bg-amber-100" },
  order: { icon: "🛒", color: "bg-red-100" },
  payment: { icon: "💳", color: "bg-indigo-100" },
  expense: { icon: "💸", color: "bg-red-100" },
};

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  const router = useRouter();
  const t = useTranslation();
  const n = useLocalNum();

  // Short, card-sized titles — the full sentence (translateFullMessage)
  // still exists for anywhere that needs the longer explanation.
  const shortTitle = (message: string): string => {
    const map: Record<string, string> = {
      "Products completely out of stock": t.admin.alertOutOfStockShort,
      "Products with some variants out of stock": t.admin.alertPartialOOSShort,
      "Low stock products need attention": t.admin.alertLowStockShort,
      "Pending orders require action": t.admin.alertPendingOrdersShort,
      "Pending payments awaiting confirmation": t.admin.alertPendingPaymentsShort,
      "Net profit is negative this period": t.admin.alertNegativeProfitShort,
    };
    if (map[message]) return map[message];
    if (message.startsWith("Expenses are")) return t.admin.alertHighExpensesShort;
    return message;
  };

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
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {alerts.map((alert, i) => {
        const m = alertMeta[alert.type] ?? alertMeta.order;
        return (
          <div key={i} className="w-[calc(50%-0.25rem)] sm:w-40">
            <InventoryAlertCard
              title={shortTitle(alert.message)}
              value={n(alert.count)}
              icon={m.icon}
              color={m.color}
              onClick={() => handleAction(alert)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AlertsSection;
