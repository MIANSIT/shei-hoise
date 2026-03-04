"use client";

import { Calendar, FileText, Monitor, CreditCard, AlignLeft, Building2, ReceiptText } from "lucide-react";
import dayjs from "dayjs";
import type { Expense } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";
import { PAYMENT_METHOD_CONFIG, isPaymentMethodKey } from "@/lib/types/expense/expense-constants";
import { DetailRow } from "./ExpenseDetailRow";

interface ExpenseDetailContentProps {
  expense: Expense;
  currencyIcon: React.ReactNode;
}

export function ExpenseDetailContent({ expense, currencyIcon }: ExpenseDetailContentProps) {
  const color = expense.category ? getCategoryColor(expense.category) : "#6366f1";

  return (
    <>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(color, 0.12)}, ${hexToRgba(color, 0.04)})`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: hexToRgba(color, 0.15),
              border: `1.5px solid ${hexToRgba(color, 0.3)}`,
            }}
          >
            {expense.category?.icon ? (
              <DynamicLucideIcon name={expense.category.icon} size={20} color={color} />
            ) : (
              <ReceiptText size={20} color={color} strokeWidth={2} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white m-0 leading-tight">
              {expense.title}
            </h2>
            {expense.vendor_name && (
              <p className="text-sm text-gray-400 dark:text-gray-500 m-0 mt-0.5 flex items-center gap-1">
                <Building2 size={11} />
                {expense.vendor_name}
              </p>
            )}
          </div>
          {/* Amount */}
          <div
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-base shrink-0"
            style={{ background: hexToRgba(color, 0.12), color }}
          >
            <span>{currencyIcon}</span>
            <span>
              {Number(expense.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="px-5 py-1 bg-white dark:bg-gray-800">
        <DetailRow icon={<Calendar size={14} color="#6366f1" />} label="Date">
          <span>{dayjs(expense.expense_date).format("MMM D, YYYY")}</span>
          <span className="text-xs text-gray-400 ml-2">{dayjs(expense.expense_date).fromNow()}</span>
        </DetailRow>

        {expense.category && (
          <DetailRow
            icon={<DynamicLucideIcon name={expense.category.icon || "Tag"} size={14} color={color} />}
            label="Category"
          >
            <span style={{ color }}>{expense.category.name}</span>
          </DetailRow>
        )}

        {expense.payment_method && isPaymentMethodKey(expense.payment_method) && (
          <DetailRow
            icon={<CreditCard size={14} color={PAYMENT_METHOD_CONFIG[expense.payment_method].color} />}
            label="Payment Method"
          >
            <span style={{ color: PAYMENT_METHOD_CONFIG[expense.payment_method].color }}>
              {PAYMENT_METHOD_CONFIG[expense.payment_method].label}
            </span>
          </DetailRow>
        )}

        {expense.platform && (
          <DetailRow icon={<Monitor size={14} color="#8b5cf6" />} label="Platform">
            {expense.platform}
          </DetailRow>
        )}

        {expense.description && (
          <DetailRow icon={<AlignLeft size={14} color="#6b7280" />} label="Description">
            <span className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {expense.description}
            </span>
          </DetailRow>
        )}

        {expense.notes && (
          <DetailRow icon={<FileText size={14} color="#a5b4fc" />} label="Notes">
            <span className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {expense.notes}
            </span>
          </DetailRow>
        )}
      </div>
    </>
  );
}