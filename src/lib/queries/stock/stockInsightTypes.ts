/**
 * How a SKU's stock is doing against how fast it sells:
 *  - restock: sold out but still selling, or about a week of stock left
 *  - slow:    hasn't sold in 30 days, or more than ~6 months of stock
 *  - dead:    in stock but nothing sold in 90 days
 *  - new:     added in the last 30 days, too early to judge
 *  - healthy: selling at a pace its stock covers
 */
export type StockHealth = "restock" | "slow" | "dead" | "new" | "healthy";

/** One product, or one variant of a product (a size or colour sells on its own). */
export interface StockInsightRow {
  productId: string;
  variantId: string | null;
  /** "Shirt — Large" for a variant. */
  name: string;
  sku: string | null;
  categoryName: string | null;
  /** Units on hand. */
  stock: number;
  lowStockThreshold: number;
  sold30: number;
  sold90: number;
  /** YYYY-MM-DD of the latest sale in the last 90 days, null if none. */
  lastSoldDate: string | null;
  /** YYYY-MM-DD stock was last added by hand in the last year, null if never. */
  lastAddedDate: string | null;
  /** Days the stock lasts at the last 30 days' pace; null when nothing sold. */
  daysLeft: number | null;
  /** Trade price of one unit. */
  unitCost: number;
  /** Units on hand × trade price: money sitting on the shelf. */
  valueTp: number;
  health: StockHealth;
}

export interface StockInsights {
  rows: StockInsightRow[];
  summary: Record<StockHealth, { count: number; value: number }>;
}

export type StockInsightsResult = { ok: true; data: StockInsights } | { ok: false; error: string };

/** A product's worst SKU decides how the product as a whole is shown. */
const SEVERITY: Record<StockHealth, number> = { restock: 0, dead: 1, slow: 2, new: 3, healthy: 4 };

export interface ProductInsight {
  productId: string;
  stock: number;
  sold30: number;
  sold90: number;
  lastSoldDate: string | null;
  lastAddedDate: string | null;
  daysLeft: number | null;
  valueTp: number;
  health: StockHealth;
}

/**
 * Rolls a product's SKUs up into one figure per product, for the stock list
 * where a product is a single row: totals for stock, sales and value, the
 * latest dates, and the health of its most urgent SKU.
 * @returns a map from product id to its rolled-up figures
 */
export function rollUpByProduct(rows: readonly StockInsightRow[]): Map<string, ProductInsight> {
  const byProduct = new Map<string, ProductInsight>();
  for (const row of rows) {
    const existing = byProduct.get(row.productId);
    const entry: ProductInsight = existing ?? {
      productId: row.productId,
      stock: 0,
      sold30: 0,
      sold90: 0,
      lastSoldDate: null,
      lastAddedDate: null,
      daysLeft: null,
      valueTp: 0,
      health: row.health,
    };
    entry.stock += row.stock;
    entry.sold30 += row.sold30;
    entry.sold90 += row.sold90;
    entry.valueTp += row.valueTp;
    if (row.lastSoldDate && (!entry.lastSoldDate || row.lastSoldDate > entry.lastSoldDate)) {
      entry.lastSoldDate = row.lastSoldDate;
    }
    if (row.lastAddedDate && (!entry.lastAddedDate || row.lastAddedDate > entry.lastAddedDate)) {
      entry.lastAddedDate = row.lastAddedDate;
    }
    if (SEVERITY[row.health] < SEVERITY[entry.health]) entry.health = row.health;
    byProduct.set(row.productId, entry);
  }
  for (const entry of byProduct.values()) {
    entry.daysLeft = entry.sold30 > 0 ? Math.round(entry.stock / (entry.sold30 / 30)) : null;
  }
  return byProduct;
}

/** What the stock list needs to show sales speed on each row. */
export interface StockInsightLookup {
  /** One figure per product (its SKUs rolled up). */
  byProduct: Map<string, ProductInsight>;
  /** One figure per variant, keyed `productId:variantId`. */
  bySku: Map<string, StockInsightRow>;
}

/** Key for {@link StockInsightLookup.bySku}. */
export function skuInsightKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? ""}`;
}

/**
 * Builds the lookups the stock list reads from.
 * @returns per-product and per-variant maps
 */
export function buildInsightLookup(rows: readonly StockInsightRow[]): StockInsightLookup {
  const bySku = new Map<string, StockInsightRow>();
  for (const row of rows) bySku.set(skuInsightKey(row.productId, row.variantId), row);
  return { byProduct: rollUpByProduct(rows), bySku };
}

/** Product ids that have at least one SKU in the given health state. */
export function productIdsWithHealth(rows: readonly StockInsightRow[], health: StockHealth): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) if (row.health === health) ids.add(row.productId);
  return ids;
}
