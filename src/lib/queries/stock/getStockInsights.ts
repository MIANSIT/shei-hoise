"use server";

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, authorizeForStore, canUseBranch } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import type { StockHealth, StockInsightRow, StockInsights, StockInsightsResult } from "./stockInsightTypes";

const SLOW_AFTER_DAYS = 30;
const DEAD_AFTER_DAYS = 90;
const RESTOCK_WITHIN_DAYS = 7;
const OVERSTOCK_DAYS = 180;
/** How far back "last stock added" looks. */
const RESTOCK_LOOKBACK_DAYS = 365;
/** Stock movements that mean the owner added stock (not a sale returning, not a transfer). */
const ADD_REASONS = ["manual_adjustment", "bulk_adjustment", "recount", "restock", "purchase"];

interface InventoryRow {
  quantity_available: number | null;
  low_stock_threshold: number | null;
  track_inventory: boolean | null;
}
interface VariantRow {
  id: string;
  variant_name: string | null;
  sku: string | null;
  tp_price: number | null;
  is_active: boolean | null;
  product_inventory: InventoryRow[] | null;
}
interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  tp_price: number | null;
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
  product_inventory: InventoryRow[] | null;
  product_variants: VariantRow[] | null;
}
interface BranchInventoryRow {
  product_id: string;
  variant_id: string | null;
  quantity_available: number | null;
}
interface SaleRow {
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  order: { order_date: string } | { order_date: string }[] | null;
}
interface MovementRow {
  product_id: string;
  variant_id: string | null;
  created_at: string;
}

const skuKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;

/**
 * Sales speed and stock health for every active product (each variant on its
 * own), so the owner can see what to restock, what sells slowly and what has
 * stopped selling. Needs the "stock.insights" permission. Stores with
 * branches: pass a branch for that branch's stock and sales, or null for the
 * whole store.
 * @returns the rows and a summary, or why it isn't allowed
 */
export async function getStockInsights(
  storeId: string,
  branchId: string | null,
): Promise<StockInsightsResult> {
  try {
    const auth = await authorizeForStore(storeId, "stock.insights");
    if (!auth.ok) return { ok: false, error: auth.error };
    if (branchId && !canUseBranch(auth.actor, branchId)) return { ok: false, error: BRANCH_SCOPE_ERROR };

    const today = dayjs().startOf("day");
    const since30 = today.subtract(SLOW_AFTER_DAYS, "day").format("YYYY-MM-DD");
    const since90 = today.subtract(DEAD_AFTER_DAYS, "day").format("YYYY-MM-DD");
    const sinceRestock = today.subtract(RESTOCK_LOOKBACK_DAYS, "day").toISOString();

    const [products, branchStock, sales, movements] = await Promise.all([
      fetchAllPaged<ProductRow>((from, to) =>
        supabaseAdmin
          .from("products")
          .select(
            `id, name, sku, tp_price, created_at,
             categories(name),
             product_inventory(quantity_available, low_stock_threshold, track_inventory),
             product_variants(id, variant_name, sku, tp_price, is_active,
               product_inventory(quantity_available, low_stock_threshold, track_inventory))`,
          )
          .eq("store_id", storeId)
          .eq("status", "active")
          // A bundle has no stock of its own — it draws on its parts.
          .neq("product_type", "bundle")
          .order("id")
          .range(from, to) as unknown as PromiseLike<{
          data: ProductRow[] | null;
          error: { message: string } | null;
        }>,
      ),
      branchId
        ? fetchAllPaged<BranchInventoryRow>((from, to) =>
            supabaseAdmin
              .from("branch_inventory")
              .select("product_id, variant_id, quantity_available")
              .eq("store_id", storeId)
              .eq("branch_id", branchId)
              .order("id")
              .range(from, to) as unknown as PromiseLike<{
              data: BranchInventoryRow[] | null;
              error: { message: string } | null;
            }>,
          )
        : Promise.resolve<BranchInventoryRow[]>([]),
      fetchAllPaged<SaleRow>((from, to) => {
        let query = supabaseAdmin
          .from("order_items")
          .select("product_id, variant_id, quantity, order:orders!inner(order_date, status, store_id, branch_id)")
          .eq("order.store_id", storeId)
          .gte("order.order_date", since90)
          .not("order.status", "in", "(cancelled,returned)");
        if (branchId) query = query.eq("order.branch_id", branchId);
        return query.order("id").range(from, to) as unknown as PromiseLike<{
          data: SaleRow[] | null;
          error: { message: string } | null;
        }>;
      }),
      fetchAllPaged<MovementRow>((from, to) => {
        let query = supabaseAdmin
          .from("stock_movements")
          .select("product_id, variant_id, created_at, product:products!inner(store_id)")
          .eq("product.store_id", storeId)
          .gt("delta", 0)
          .in("reason", ADD_REASONS)
          .gte("created_at", sinceRestock);
        if (branchId) query = query.eq("branch_id", branchId);
        return query.order("created_at", { ascending: false }).range(from, to) as unknown as PromiseLike<{
          data: MovementRow[] | null;
          error: { message: string } | null;
        }>;
      }).catch(() => [] as MovementRow[]),
    ]);

    const soldBySku = new Map<string, { sold30: number; sold90: number; last: string | null }>();
    const soldByProduct = new Map<string, { sold30: number; sold90: number; last: string | null }>();
    for (const sale of sales) {
      if (!sale.product_id) continue;
      const order = Array.isArray(sale.order) ? sale.order[0] : sale.order;
      if (!order) continue;
      for (const [map, key] of [
        [soldBySku, skuKey(sale.product_id, sale.variant_id)],
        [soldByProduct, sale.product_id],
      ] as const) {
        const entry = map.get(key) ?? { sold30: 0, sold90: 0, last: null };
        entry.sold90 += sale.quantity;
        if (order.order_date >= since30) entry.sold30 += sale.quantity;
        if (!entry.last || order.order_date > entry.last) entry.last = order.order_date;
        map.set(key, entry);
      }
    }

    const lastAddedBySku = new Map<string, string>();
    const lastAddedByProduct = new Map<string, string>();
    for (const m of movements) {
      // Newest first, so the first one seen is the latest.
      const key = skuKey(m.product_id, m.variant_id);
      if (!lastAddedBySku.has(key)) lastAddedBySku.set(key, m.created_at);
      if (!lastAddedByProduct.has(m.product_id)) lastAddedByProduct.set(m.product_id, m.created_at);
    }

    const branchQty = new Map<string, number>();
    for (const row of branchStock) {
      const key = skuKey(row.product_id, row.variant_id);
      branchQty.set(key, (branchQty.get(key) ?? 0) + Number(row.quantity_available ?? 0));
    }

    const rows: StockInsightRow[] = [];

    const judge = (input: {
      productId: string;
      variantId: string | null;
      name: string;
      sku: string | null;
      categoryName: string | null;
      stock: number;
      unitCost: number;
      threshold: number;
      createdAt: string;
      sold: { sold30: number; sold90: number; last: string | null } | undefined;
      lastAdded: string | undefined;
    }) => {
      const sold = input.sold ?? { sold30: 0, sold90: 0, last: null };
      const ageDays = today.diff(dayjs(input.createdAt).startOf("day"), "day");
      const perDay = sold.sold30 / SLOW_AFTER_DAYS;
      const daysLeft = sold.sold30 > 0 ? Math.round(input.stock / perDay) : null;

      let health: StockHealth;
      if (input.stock <= 0) {
        // Out of stock matters only if people were still buying it.
        if (sold.sold30 <= 0) return;
        health = "restock";
      } else if (sold.sold90 <= 0) {
        health = ageDays >= DEAD_AFTER_DAYS ? "dead" : ageDays >= SLOW_AFTER_DAYS ? "slow" : "new";
      } else if (sold.sold30 <= 0) {
        health = "slow";
      } else if (daysLeft !== null && daysLeft <= RESTOCK_WITHIN_DAYS) {
        health = "restock";
      } else if (daysLeft !== null && daysLeft > OVERSTOCK_DAYS) {
        health = "slow";
      } else {
        health = "healthy";
      }

      rows.push({
        productId: input.productId,
        variantId: input.variantId,
        name: input.name,
        sku: input.sku,
        categoryName: input.categoryName,
        stock: input.stock,
        lowStockThreshold: input.threshold,
        sold30: sold.sold30,
        sold90: sold.sold90,
        lastSoldDate: sold.last,
        lastAddedDate: input.lastAdded ? input.lastAdded.slice(0, 10) : null,
        daysLeft: input.stock > 0 ? daysLeft : 0,
        unitCost: input.unitCost,
        valueTp: input.stock * input.unitCost,
        health,
      });
    };

    for (const p of products) {
      const categoryName = Array.isArray(p.categories) ? (p.categories[0]?.name ?? null) : (p.categories?.name ?? null);
      const variants = (p.product_variants ?? []).filter((v) => v.is_active !== false);
      const productInventory = p.product_inventory?.[0];

      if (variants.length > 0) {
        for (const v of variants) {
          const inv = v.product_inventory?.[0];
          const key = skuKey(p.id, v.id);
          judge({
            productId: p.id,
            variantId: v.id,
            name: v.variant_name ? `${p.name} — ${v.variant_name}` : p.name,
            sku: v.sku ?? p.sku,
            categoryName,
            stock: branchId ? (branchQty.get(key) ?? 0) : Number(inv?.quantity_available ?? 0),
            unitCost: Number(v.tp_price ?? p.tp_price ?? 0),
            threshold: Number(inv?.low_stock_threshold ?? productInventory?.low_stock_threshold ?? 5),
            createdAt: p.created_at,
            sold: soldBySku.get(key),
            lastAdded: lastAddedBySku.get(key),
          });
        }
      } else {
        // Products that don't track stock have no meaningful count to judge.
        if (productInventory && productInventory.track_inventory === false) continue;
        const key = skuKey(p.id, null);
        judge({
          productId: p.id,
          variantId: null,
          name: p.name,
          sku: p.sku,
          categoryName,
          stock: branchId ? (branchQty.get(key) ?? 0) : Number(productInventory?.quantity_available ?? 0),
          unitCost: Number(p.tp_price ?? 0),
          threshold: Number(productInventory?.low_stock_threshold ?? 5),
          createdAt: p.created_at,
          sold: soldByProduct.get(p.id) ?? soldBySku.get(key),
          lastAdded: lastAddedByProduct.get(p.id),
        });
      }
    }

    const summary: StockInsights["summary"] = {
      restock: { count: 0, value: 0 },
      slow: { count: 0, value: 0 },
      dead: { count: 0, value: 0 },
      new: { count: 0, value: 0 },
      healthy: { count: 0, value: 0 },
    };
    for (const row of rows) {
      summary[row.health].count += 1;
      summary[row.health].value += row.valueTp;
    }

    const severity: Record<StockHealth, number> = { restock: 0, dead: 1, slow: 2, new: 3, healthy: 4 };
    rows.sort(
      (a, b) =>
        severity[a.health] - severity[b.health] ||
        (a.health === "restock" ? (a.daysLeft ?? 0) - (b.daysLeft ?? 0) : b.valueTp - a.valueTp) ||
        a.name.localeCompare(b.name),
    );

    return { ok: true, data: { rows, summary } };
  } catch (error) {
    console.error("getStockInsights failed:", error);
    return { ok: false, error: "Could not load stock insights. Please try again." };
  }
}
