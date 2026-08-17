import dayjs from "dayjs";
import type { ProductWithStock } from "@/lib/queries/products/getProductWithStock";

// Trader price sheet: what a trader/reseller pays us for each item.
//
// The basis is `tp_price`, which this codebase already treats as the cost
// basis — see exportStock.ts, which computes profit as `sellingPrice - tpPrice`.
// A trader buys above that cost by an agreed margin, so:
//
//   traderPrice = tpPrice × (1 + markupPercent / 100)
//
// The markup is a per-row percentage with a store-wide default, so one sheet
// can carry a blanket 20% while a few lines are negotiated separately. Nothing
// here is persisted — a sheet is generated per trader, on demand.

// ─── Types ────────────────────────────────────────────────────────────────────

export type TraderExportFormat = "csv" | "xlsx";

/** Where a line's markup came from, so the UI can show what is driving it. */
export type MarkupSource = "product" | "category" | "default";

/** A product/variant line before a markup has been applied. */
export interface TraderPriceItem {
  /** `${productId}:${variantId ?? "-"}` — stable identity for per-row overrides. */
  key: string;
  productName: string;
  variantName: string;
  sku: string;
  tpPrice: number | null;
  sellingPrice: number;
  categoryId: string | null;
  categoryName: string | null;
}

/** A line with its markup resolved and trader price computed. */
export interface TraderPriceRow extends TraderPriceItem {
  markupPercent: number;
  markupSource: MarkupSource;
  traderPrice: number | null;
}

/** A category present in the current selection, with how many lines it covers. */
export interface CategoryBucket {
  id: string;
  name: string;
  lineCount: number;
}

/** Sentinel key for products with no category, so they can still be grouped. */
export const UNCATEGORISED = "__uncategorised__";

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * Flattens products into one line per variant (or one per product when a
 * product has no variants), matching how exportStock.ts treats the catalogue.
 *
 * Bundles are excluded. A bundle is an ordinary `products` row with
 * `product_type = 'bundle'` whose price is a packaging decision over its
 * component items, so marking its TP up alongside those same components would
 * quote the trader for the parts twice — once inside the bundle and once on
 * their own line.
 */
export function buildTraderItems(
  products: ProductWithStock[],
): TraderPriceItem[] {
  const items: TraderPriceItem[] = [];

  for (const p of products) {
    if (p.product_type === "bundle") continue;

    if (p.variants?.length) {
      for (const v of p.variants) {
        items.push({
          key: `${p.id}:${v.id}`,
          productName: p.name,
          variantName: v.variant_name,
          sku: v.sku ?? p.sku ?? "",
          tpPrice: v.tp_price ?? null,
          sellingPrice:
            v.discounted_price != null && v.discounted_price > 0
              ? v.discounted_price
              : v.base_price,
          categoryId: p.category_id,
          categoryName: p.category_name,
        });
      }
    } else {
      items.push({
        key: `${p.id}:-`,
        productName: p.name,
        variantName: "-",
        sku: p.sku ?? "",
        tpPrice: p.tp_price ?? null,
        sellingPrice:
          p.discounted_price != null && p.discounted_price > 0
            ? p.discounted_price
            : p.base_price,
        categoryId: p.category_id,
        categoryName: p.category_name,
      });
    }
  }

  return items;
}

/**
 * Applies markups to produce the final rows.
 *
 * Resolution is most-specific-wins: a per-product override beats a category
 * rate, which beats the store-wide default. That ordering is what lets you set
 * one blanket number, adjust a couple of categories, and still hand-price a
 * few individual lines without any of the three fighting each other.
 *
 * @param items          Lines from `buildTraderItems`
 * @param defaultPct     Store-wide markup, the fallback for everything
 * @param overrides      Per-line markup by `TraderPriceItem.key`
 * @param categoryPcts   Per-category markup by category id (or UNCATEGORISED)
 */
export function applyMarkup(
  items: TraderPriceItem[],
  defaultPct: number,
  overrides: Record<string, number> = {},
  categoryPcts: Record<string, number> = {},
): TraderPriceRow[] {
  return items.map((item) => {
    const catKey = item.categoryId ?? UNCATEGORISED;

    let markupPercent: number;
    let markupSource: MarkupSource;

    if (overrides[item.key] != null) {
      markupPercent = overrides[item.key];
      markupSource = "product";
    } else if (categoryPcts[catKey] != null) {
      markupPercent = categoryPcts[catKey];
      markupSource = "category";
    } else {
      markupPercent = defaultPct;
      markupSource = "default";
    }

    return {
      ...item,
      markupPercent,
      markupSource,
      // Null TP means no cost basis recorded, so there is nothing to mark up.
      // Emitting 0 would read as "free" on the trader's sheet, which is worse
      // than an obviously blank cell.
      traderPrice:
        item.tpPrice == null
          ? null
          : roundMoney(item.tpPrice * (1 + markupPercent / 100)),
    };
  });
}

/**
 * Distinct categories across the given lines, alphabetical, with uncategorised
 * last so it doesn't lead the list.
 */
export function collectCategories(items: TraderPriceItem[]): CategoryBucket[] {
  const map = new Map<string, CategoryBucket>();

  for (const item of items) {
    const id = item.categoryId ?? UNCATEGORISED;
    const existing = map.get(id);
    if (existing) {
      existing.lineCount += 1;
    } else {
      map.set(id, {
        id,
        name: item.categoryName ?? "Uncategorised",
        lineCount: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.id === UNCATEGORISED) return 1;
    if (b.id === UNCATEGORISED) return -1;
    return a.name.localeCompare(b.name);
  });
}

/** Rounds to 2dp without float drift (e.g. 1.005 → 1.01, not 1.00). */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Lines with no `tp_price` — surfaced in the UI so blanks aren't a surprise. */
export function countMissingTp(items: TraderPriceItem[]): number {
  return items.filter((i) => i.tpPrice == null).length;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatMoney(amount: number | null): string {
  return amount == null ? "" : Number(amount).toFixed(2);
}

// The sheet is handed to the trader, so it carries only the two prices that
// concern them: what they pay (their TP, i.e. our cost after markup) and the
// retail price they can sell at. Our own cost basis and the markup percentage
// are deliberately omitted — together they would let the trader derive exactly
// what we paid. Both stay visible in the dashboard preview, which is ours.
function getHeaders(currencySymbol: string): string[] {
  return [
    "Product",
    "Variant",
    "SKU",
    `TP Price (${currencySymbol})`,
    `Retail Price (${currencySymbol})`,
  ];
}

function getRows(rows: TraderPriceRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.productName,
    r.variantName,
    r.sku,
    formatMoney(r.traderPrice),
    formatMoney(r.sellingPrice),
  ]);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportTraderCSV(
  rows: TraderPriceRow[],
  filename = "trader-prices",
  currencySymbol = "৳",
): void {
  const escape = (v: string | number) =>
    `"${String(v).replace(/"/g, '""').replace(/\n/g, " ")}"`;

  const lines = [
    getHeaders(currencySymbol).map(escape).join(","),
    ...getRows(rows).map((row) => row.map(escape).join(",")),
  ];

  // UTF-8 BOM so Excel renders Bengali product names instead of mojibake —
  // same reason as exportStock.ts.
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${filename}.csv`);
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

export async function exportTraderXLSX(
  rows: TraderPriceRow[],
  filename = "trader-prices",
  currencySymbol = "৳",
): Promise<void> {
  const XLSX = await import("xlsx");

  const ws = XLSX.utils.aoa_to_sheet([
    getHeaders(currencySymbol),
    ...getRows(rows),
  ]);

  ws["!cols"] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trader Prices");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Main export entry point ──────────────────────────────────────────────────

export async function exportTraderPricing(
  format: TraderExportFormat,
  rows: TraderPriceRow[],
  storeSlug?: string,
  currencySymbol = "৳",
  traderName?: string,
): Promise<void> {
  const stamp = dayjs().format("YYYY-MM-DD");

  // Strips only what is genuinely unsafe in a filename, rather than everything
  // outside [a-z0-9]. Bengali store and trader names are the norm here
  // ("মজুমদার ফিশারিজ" is a live store), and an ASCII-only slug erases them
  // completely — a Bengali-only name would reduce to an empty string and drop
  // out of the filename with no indication why.
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[/\\:*?"<>|]/g, "") // reserved on Windows/macOS
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");

  const parts = [
    storeSlug ? slugify(storeSlug) : null,
    traderName ? slugify(traderName) : null,
    "trader-prices",
    stamp,
  ].filter(Boolean);

  const name = parts.join("-");

  switch (format) {
    case "csv":
      exportTraderCSV(rows, name, currencySymbol);
      break;
    case "xlsx":
      await exportTraderXLSX(rows, name, currencySymbol);
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
