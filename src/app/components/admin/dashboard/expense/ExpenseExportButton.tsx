"use client";

import { memo, useState } from "react";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownloadOutlined, LoadingOutlined } from "@ant-design/icons";
import { FileSpreadsheet, FileText, FileDown } from "lucide-react";
import type { Expense } from "@/lib/types/expense/type";
import {
  exportExpenses,
  type ExportFormat,
} from "@/lib/types/expense/exportExpenses";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface ExpenseExportButtonProps {
  expenses: Expense[];
  storeSlug?: string;
  disabled?: boolean;
}

const FORMAT_META: Record<
  ExportFormat,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }
> = {
  xlsx: {
    label: "Excel (.xlsx)",
    description: "Open in Excel or Google Sheets",
    icon: <FileSpreadsheet size={15} />,
    color: "#16a34a",
  },
  csv: {
    label: "CSV (.csv)",
    description: "Universal, works everywhere",
    icon: <FileDown size={15} />,
    color: "#2563eb",
  },
  pdf: {
    label: "PDF (.pdf)",
    description: "Print-ready, share easily",
    icon: <FileText size={15} />,
    color: "#dc2626",
  },
};

function ExpenseExportButton({
  expenses,
  storeSlug,
  disabled = false,
}: ExpenseExportButtonProps) {
  const { success, error, info } = useSheiNotification();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const { currency } = useUserCurrencyIcon();
  // For file exports we need a plain string, not a ReactNode.
  // Fall back to "$" while loading or if currency is unmapped.
  const CURRENCY_SYMBOLS: Record<string, string> = {
    BDT: "৳",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };
  const currencySymbol = currency
    ? (CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency)
    : "$";

  const handleExport = async (format: ExportFormat) => {
    if (!expenses.length) {
      info("No expenses to export. Try adjusting your filters.");
      return;
    }
    setExporting(format);
    try {
      await exportExpenses(format, expenses, storeSlug, currencySymbol);
      success(
        `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} exported as ${FORMAT_META[format].label}.`,
      );
    } catch (err) {
      console.error("[ExpenseExportButton] export failed:", err);
      error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const menuItems: MenuProps["items"] = (
    Object.entries(FORMAT_META) as [
      ExportFormat,
      (typeof FORMAT_META)[ExportFormat],
    ][]
  ).map(([format, meta]) => ({
    key: format,
    disabled: exporting !== null,
    onClick: () => handleExport(format),
    label: (
      <div className="flex items-center gap-2.5 py-1" style={{ minWidth: 220 }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}30`,
            color: meta.color,
          }}
        >
          {exporting === format ? (
            <LoadingOutlined style={{ fontSize: 13 }} />
          ) : (
            meta.icon
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="m-0 text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-tight flex items-center gap-1.5">
            {meta.label}
            {format === "xlsx" && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                Best
              </span>
            )}
          </p>
          <p className="m-0 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {meta.description}
          </p>
        </div>
      </div>
    ),
  }));

  return (
    <Dropdown
      menu={{
        items: menuItems,
        style: { padding: 6, borderRadius: 14, minWidth: 270 },
      }}
      trigger={["click"]}
      placement="bottomRight"
      disabled={disabled || exporting !== null}
    >
      <Button
        icon={exporting ? <LoadingOutlined /> : <DownloadOutlined />}
        className="rounded-xl h-9 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 font-medium"
      >
        <span className="hidden sm:inline">
          {exporting ? "Exporting…" : "Export"}
        </span>
      </Button>
    </Dropdown>
  );
}

export default memo(ExpenseExportButton);
