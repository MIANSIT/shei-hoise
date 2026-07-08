import dayjs from "dayjs";
import type { ProductWithStock } from "@/lib/queries/products/getProductWithStock";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StockExportFormat = "csv" | "xlsx";

export interface StockExportRow {
  productName: string;
  variantName: string;
  sku: string;
  tpPrice: number | null;
  sellingPrice: number;
  profit: number | null;
  marginPercent: number | null;
  stockAvailable: number;
  stockReserved: number;
  status: string;
}

// Profit = selling − TP; margin % = profit ÷ selling. Both are null when TP
// price isn't set (can't compute margin without a cost basis) or the item is
// free (avoids a divide-by-zero).
function computeMargin(
  sellingPrice: number,
  tpPrice: number | null,
): { profit: number | null; marginPercent: number | null } {
  if (tpPrice == null || sellingPrice <= 0) {
    return { profit: null, marginPercent: null };
  }
  const profit = sellingPrice - tpPrice;
  return { profit, marginPercent: (profit / sellingPrice) * 100 };
}

// ─── Build rows from product/variant data ─────────────────────────────────────
// One row per variant when a product has variants, otherwise one row per
// simple product — matches how stock is actually tracked (product_inventory
// is keyed per-variant when variants exist).

export function buildStockRows(products: ProductWithStock[]): StockExportRow[] {
  const rows: StockExportRow[] = [];

  for (const p of products) {
    if (p.variants?.length) {
      for (const v of p.variants) {
        const sellingPrice =
          v.discounted_price != null && v.discounted_price > 0
            ? v.discounted_price
            : v.base_price;
        const tpPrice = v.tp_price ?? null;
        rows.push({
          productName: p.name,
          variantName: v.variant_name,
          sku: v.sku ?? p.sku ?? "",
          tpPrice,
          sellingPrice,
          ...computeMargin(sellingPrice, tpPrice),
          stockAvailable: v.stock.quantity_available,
          stockReserved: v.stock.quantity_reserved,
          status: v.is_active ? p.status : "inactive",
        });
      }
    } else {
      const sellingPrice =
        p.discounted_price != null && p.discounted_price > 0
          ? p.discounted_price
          : p.base_price;
      const tpPrice = p.tp_price ?? null;
      rows.push({
        productName: p.name,
        variantName: "-",
        sku: p.sku ?? "",
        tpPrice,
        sellingPrice,
        ...computeMargin(sellingPrice, tpPrice),
        stockAvailable: p.stock?.quantity_available ?? 0,
        stockReserved: p.stock?.quantity_reserved ?? 0,
        status: p.status,
      });
    }
  }

  return rows;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatMoney(amount: number | null): string {
  return amount == null ? "" : Number(amount).toFixed(2);
}

function formatPercent(value: number | null): string {
  return value == null ? "" : `${value.toFixed(1)}%`;
}

function getRows(rows: StockExportRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.productName,
    r.variantName,
    r.sku,
    formatMoney(r.tpPrice),
    formatMoney(r.sellingPrice),
    formatMoney(r.profit),
    formatPercent(r.marginPercent),
    r.stockAvailable,
    r.stockReserved,
    r.status,
  ]);
}

function getHeaders(currencySymbol: string): string[] {
  return [
    "Product",
    "Variant",
    "SKU",
    `TP Price (${currencySymbol})`,
    `Selling Price (${currencySymbol})`,
    `Profit/Unit (${currencySymbol})`,
    "Margin %",
    "Stock Available",
    "Stock Reserved",
    "Status",
  ];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(
  rows: StockExportRow[],
  filename = "stock",
  currencySymbol = "৳",
): void {
  const escape = (v: string | number) =>
    `"${String(v).replace(/"/g, '""').replace(/\n/g, " ")}"`;

  const headers = getHeaders(currencySymbol);
  const lines = [
    headers.map(escape).join(","),
    ...getRows(rows).map((row) => row.map(escape).join(",")),
  ];

  // Prefix a UTF-8 BOM — without it, Excel misreads non-ASCII text (e.g.
  // Bengali product names) as a different encoding and shows garbled characters.
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${filename}.csv`);
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

export async function exportXLSX(
  rows: StockExportRow[],
  filename = "stock",
  currencySymbol = "৳",
): Promise<void> {
  const XLSX = await import("xlsx");

  const headers = getHeaders(currencySymbol);
  const wsData = [headers, ...getRows(rows)];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Main export entry point ──────────────────────────────────────────────────

export async function exportStock(
  format: StockExportFormat,
  products: ProductWithStock[],
  storeSlug?: string,
  currencySymbol = "৳",
): Promise<void> {
  const rows = buildStockRows(products);
  const stamp = dayjs().format("YYYY-MM-DD");

  const safeSlug = storeSlug
    ? storeSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-|-$/g, "")
    : null;

  const name = safeSlug ? `${safeSlug}-stock-${stamp}` : `stock-${stamp}`;

  switch (format) {
    case "csv":
      exportCSV(rows, name, currencySymbol);
      break;
    case "xlsx":
      await exportXLSX(rows, name, currencySymbol);
      break;
  }
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
