"use client";

import { memo, useState } from "react";
import { Button, Dropdown, Popover } from "antd";
import type { MenuProps } from "antd";
import { DownloadOutlined, LoadingOutlined, LockOutlined } from "@ant-design/icons";
import { FileSpreadsheet, FileDown } from "lucide-react";
import type { ProductWithStock } from "@/lib/queries/products/getProductWithStock";
import {
  exportStock,
  type StockExportFormat,
} from "@/lib/types/products/exportStock";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import ExportUpsell from "@/app/components/admin/common/ExportUpsell";

interface StockExportButtonProps {
  /** Fetches every product (all variants, all pages) matching the current filters at export time. */
  fetchAllProducts: (branchId: string | null) => Promise<ProductWithStock[]>;
  storeSlug?: string;
  /** Stores with branches: export is offered per scope (All branches + each branch). Omit for a single-scope export. */
  branches?: { id: string; name: string }[];
  /** Whether "All branches" is offered (staff limited to some branches can't). */
  allowAllBranches?: boolean;
  disabled?: boolean;
  /** True when the store's plan doesn't include the export_data feature — shows a lock + upsell instead of the export menu. */
  locked?: boolean;
}

const FORMAT_META: Record<
  StockExportFormat,
  { label: string; description: string; icon: React.ReactNode; color: string }
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
};

const slugifyBranch = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function StockExportButton({
  fetchAllProducts,
  storeSlug,
  branches = [],
  allowAllBranches = true,
  disabled = false,
  locked = false,
}: StockExportButtonProps) {
  const { success, error, info } = useSheiNotification();
  const [exporting, setExporting] = useState<StockExportFormat | null>(null);

  const { currency } = useUserCurrencyIcon();
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

  const handleExport = async (format: StockExportFormat, branch?: { id: string; name: string }) => {
    setExporting(format);
    try {
      const products = await fetchAllProducts(branch?.id ?? null);
      if (!products.length) {
        info("No products to export. Try adjusting your filters.");
        return;
      }
      const branchSlug = branch ? slugifyBranch(branch.name) : "";
      const fileSlug = storeSlug && branchSlug ? `${storeSlug}-${branchSlug}` : storeSlug;
      await exportStock(format, products, fileSlug, currencySymbol);
      success(
        `${products.length} product${products.length !== 1 ? "s" : ""} exported as ${FORMAT_META[format].label}.`,
      );
    } catch (err) {
      console.error("[StockExportButton] export failed:", err);
      error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const formatItem = (
    format: StockExportFormat,
    key: string,
    branch?: { id: string; name: string },
  ) => {
    const meta = FORMAT_META[format];
    return {
      key,
      disabled: exporting !== null,
      onClick: () => handleExport(format, branch),
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
            <p className="m-0 text-[13px] font-semibold text-foreground leading-tight flex items-center gap-1.5">
              {meta.label}
              {format === "xlsx" && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  Best
                </span>
              )}
            </p>
            <p className="m-0 text-[11px] text-muted-foreground mt-0.5">
              {meta.description}
            </p>
          </div>
        </div>
      ),
    };
  };

  const formats = Object.keys(FORMAT_META) as StockExportFormat[];

  // With branches, each scope opens a submenu of formats; otherwise a flat list.
  const scopes: { key: string; label: string; branch?: { id: string; name: string } }[] = [
    ...(allowAllBranches ? [{ key: "all", label: "All branches" }] : []),
    ...branches.map((b) => ({ key: b.id, label: b.name, branch: b })),
  ];

  const menuItems: MenuProps["items"] =
    branches.length > 0
      ? scopes.map((scope) => ({
          key: scope.key,
          label: scope.label,
          children: formats.map((format) => formatItem(format, `${scope.key}:${format}`, scope.branch)),
        }))
      : formats.map((format) => formatItem(format, format));

  if (locked) {
    return (
      <Popover
        content={<ExportUpsell />}
        trigger="click"
        placement="bottomRight"
        styles={{ container: { padding: 12, borderRadius: 14 } }}
      >
        <Button
          icon={<LockOutlined />}
          className="rounded-xl h-9 border-border bg-background/60 text-muted-foreground font-medium"
        >
          <span className="hidden sm:inline">Export</span>
        </Button>
      </Popover>
    );
  }

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
        className="rounded-xl h-9 border-border dark:bg-gray-700 dark:text-gray-300 font-medium"
      >
        <span className="hidden sm:inline">
          {exporting ? "Exporting…" : "Export"}
        </span>
      </Button>
    </Dropdown>
  );
}

export default memo(StockExportButton);
