"use client";

import { Tooltip } from "antd";
import { Receipt, Store, CreditCard, FileText } from "lucide-react";
import dayjs from "dayjs";
import type { Expense } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";
import {
  PAYMENT_METHOD_CONFIG,
  isPaymentMethodKey,
} from "@/lib/types/expense/expense-constants";

export function ExpenseCell({ record }: { record: Expense }) {
  const color = record.category ? getCategoryColor(record.category) : "#9ca3af";
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
        style={{
          background: record.category ? hexToRgba(color, 0.12) : "#f3f4f6",
        }}
      >
        {record.category?.icon ? (
          <DynamicLucideIcon
            name={record.category.icon}
            size={16}
            color={color}
          />
        ) : (
          <Receipt size={16} color="#9ca3af" strokeWidth={2} />
        )}
      </div>
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight m-0">
          {record.title}
        </p>
        {record.vendor_name && (
          <div className="flex items-center gap-1 mt-0.5">
            <Store size={10} color="#9ca3af" strokeWidth={2} />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {record.vendor_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryCell({ record }: { record: Expense }) {
  if (!record.category) return <span className="text-gray-300 text-xs">—</span>;
  const color = getCategoryColor(record.category);
  return (
    <div
      className="inline-flex items-center gap-0 rounded-lg overflow-hidden"
      style={{
        background: hexToRgba(color, 0.08),
        border: `1px solid ${hexToRgba(color, 0.2)}`,
        maxWidth: 170,
      }}
    >
      <div
        className="w-1 self-stretch shrink-0"
        style={{ background: color }}
      />
      <div className="flex items-center gap-1.5 py-1 px-2.5">
        <DynamicLucideIcon
          name={record.category.icon || "Tag"}
          size={12}
          color={color}
        />
        <span className="text-[11px] font-semibold truncate" style={{ color }}>
          {record.category.name}
        </span>
      </div>
    </div>
  );
}

export function AmountCell({
  amount,
  currencyIcon,
}: {
  amount: number;
  currencyIcon: React.ReactNode;
}) {
  return (
    <span className="font-bold text-gray-900 dark:text-white text-sm tabular-nums flex items-center gap-0.5">
      <span>{currencyIcon}</span>
      <span>
        {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
    </span>
  );
}

export function DateCell({ date }: { date: string }) {
  return (
    <div>
      <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
        {dayjs(date).format("MMM D, YYYY")}
      </span>
      <p className="text-gray-400 text-xs mt-0.5 m-0">
        {dayjs(date).fromNow()}
      </p>
    </div>
  );
}

export function PaymentCell({ method }: { method: string }) {
  if (!method || !isPaymentMethodKey(method))
    return <span className="text-gray-300 text-xs">—</span>;
  const cfg = PAYMENT_METHOD_CONFIG[method];
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap"
      style={{ background: cfg.bg }}
    >
      <CreditCard size={11} color={cfg.color} strokeWidth={2.5} />
      <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}

export function PlatformCell({ platform }: { platform?: string }) {
  if (!platform) return <span className="text-gray-200 text-xs">—</span>;
  return (
    <span className="inline-block text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 font-medium whitespace-nowrap max-w-25 truncate">
      {platform}
    </span>
  );
}

export function NotesCell({ notes }: { notes?: string }) {
  if (!notes) return <span className="text-gray-200 text-xs">—</span>;
  return (
    <Tooltip title={notes} placement="topLeft">
      <div className="flex items-center gap-1.5 cursor-pointer group">
        <FileText size={12} color="#a5b4fc" strokeWidth={2} />
        <span className="text-gray-400 text-xs truncate max-w-25 group-hover:text-indigo-500 transition-colors">
          {notes}
        </span>
      </div>
    </Tooltip>
  );
}
