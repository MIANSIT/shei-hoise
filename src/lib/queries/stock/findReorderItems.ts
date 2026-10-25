"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, authorizeForStore, canUseBranch } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

/** One thing that can be put on the reorder list: a product, or one variant of a product. */
export interface ReorderItemInfo {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  /** Trade price of one unit. */
  unitCost: number;
}

interface InventoryRow {
  quantity_available: number | null;
  low_stock_threshold: number | null;
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
  product_inventory: InventoryRow[] | null;
  product_variants: VariantRow[] | null;
}
interface BranchInventoryRow {
  product_id: string;
  variant_id: string | null;
  quantity_available: number | null;
}

const MAX_RESULTS = 25;
const ID_CHUNK = 100;

/** Removes the characters that have a meaning inside a PostgREST filter, so typed text can't change the query. */
function safeSearchText(text: string): string {
  return text.replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
}

/**
 * Looks up products (and their variants) for the reorder list, either by what
 * the owner typed or by saved keys (`productId:variantId`). Includes items that
 * are out of stock and not selling, which the suggested list leaves out.
 * @returns the matching items, or an empty list when not allowed or on failure
 */
export async function findReorderItems(
  storeId: string,
  input: { query?: string; keys?: string[] },
  branchId: string | null,
): Promise<ReorderItemInfo[]> {
  try {
    const auth = await authorizeForStore(storeId, "stock.insights");
    if (!auth.ok) return [];
    if (branchId && !canUseBranch(auth.actor, branchId)) throw new Error(BRANCH_SCOPE_ERROR);

    const select = `id, name, sku, tp_price,
      product_inventory(quantity_available, low_stock_threshold),
      product_variants(id, variant_name, sku, tp_price, is_active,
        product_inventory(quantity_available, low_stock_threshold))`;

    let products: ProductRow[] = [];
    const wantedKeys = new Set(input.keys ?? []);

    if (input.keys) {
      const productIds = [...new Set(input.keys.map((k) => k.split(":")[0]).filter(Boolean))];
      for (let i = 0; i < productIds.length; i += ID_CHUNK) {
        const { data, error } = await supabaseAdmin
          .from("products")
          .select(select)
          .eq("store_id", storeId)
          .in("id", productIds.slice(i, i + ID_CHUNK));
        if (error) throw new Error(error.message);
        products = products.concat((data ?? []) as unknown as ProductRow[]);
      }
    } else {
      const q = safeSearchText(input.query ?? "");
      if (q.length < 2) return [];
      const pattern = `%${q}%`;

      // A variant's own SKU isn't on the parent product row, so find those products too.
      const { data: variantRows } = await supabaseAdmin
        .from("product_variants")
        .select("product_id, products!inner(store_id)")
        .eq("products.store_id", storeId)
        .ilike("sku", pattern)
        .limit(MAX_RESULTS);
      const variantProductIds = [...new Set(((variantRows ?? []) as { product_id: string }[]).map((r) => r.product_id))];
      const filters = [`name.ilike.${pattern}`, `sku.ilike.${pattern}`];
      if (variantProductIds.length > 0) filters.push(`id.in.(${variantProductIds.join(",")})`);

      const { data, error } = await supabaseAdmin
        .from("products")
        .select(select)
        .eq("store_id", storeId)
        .eq("status", "active")
        .neq("product_type", "bundle")
        .or(filters.join(","))
        .order("name")
        .limit(MAX_RESULTS);
      if (error) throw new Error(error.message);
      products = (data ?? []) as unknown as ProductRow[];
    }

    // One branch's stock instead of the store total.
    const branchQty = new Map<string, number>();
    if (branchId && products.length > 0) {
      const rows = await fetchAllPaged<BranchInventoryRow>((from, to) =>
        supabaseAdmin
          .from("branch_inventory")
          .select("product_id, variant_id, quantity_available")
          .eq("store_id", storeId)
          .eq("branch_id", branchId)
          .in("product_id", products.map((p) => p.id))
          .order("id")
          .range(from, to) as unknown as PromiseLike<{
          data: BranchInventoryRow[] | null;
          error: { message: string } | null;
        }>,
      );
      for (const row of rows) {
        const key = `${row.product_id}:${row.variant_id ?? ""}`;
        branchQty.set(key, (branchQty.get(key) ?? 0) + Number(row.quantity_available ?? 0));
      }
    }

    const items: ReorderItemInfo[] = [];
    for (const p of products) {
      const variants = (p.product_variants ?? []).filter((v) => v.is_active !== false);
      const productInventory = p.product_inventory?.[0];
      if (variants.length > 0) {
        for (const v of variants) {
          const key = `${p.id}:${v.id}`;
          if (input.keys && !wantedKeys.has(key)) continue;
          const inv = v.product_inventory?.[0];
          items.push({
            productId: p.id,
            variantId: v.id,
            name: v.variant_name ? `${p.name} — ${v.variant_name}` : p.name,
            sku: v.sku ?? p.sku,
            stock: branchId ? (branchQty.get(key) ?? 0) : Number(inv?.quantity_available ?? 0),
            lowStockThreshold: Number(inv?.low_stock_threshold ?? productInventory?.low_stock_threshold ?? 5),
            unitCost: Number(v.tp_price ?? p.tp_price ?? 0),
          });
        }
      } else {
        const key = `${p.id}:`;
        if (input.keys && !wantedKeys.has(key)) continue;
        items.push({
          productId: p.id,
          variantId: null,
          name: p.name,
          sku: p.sku,
          stock: branchId ? (branchQty.get(key) ?? 0) : Number(productInventory?.quantity_available ?? 0),
          lowStockThreshold: Number(productInventory?.low_stock_threshold ?? 5),
          unitCost: Number(p.tp_price ?? 0),
        });
      }
    }
    return items;
  } catch (error) {
    console.error("findReorderItems failed:", error);
    return [];
  }
}
