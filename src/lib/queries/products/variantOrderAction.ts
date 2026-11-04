"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny } from "@/lib/permissions/server";

/**
 * The saved position of each variant (set by dragging or the arrows on the product form), for
 * the product pickers that read products from the browser (Quick Sale, Create Order and the
 * product lists). Anyone who can see products or sell can read it.
 * @returns variant id to position; empty when none is saved, the column is missing, or not allowed
 */
export async function getVariantOrderForProducts(storeId: string, productIds: string[]): Promise<Record<string, number>> {
  const order: Record<string, number> = {};
  try {
    if (productIds.length === 0) return order;
    const auth = await authorizeForStoreAny(storeId, ["products.view", "pos.view", "orders.add"]);
    if (!auth.ok) return order;

    const chunk = 200;
    for (let i = 0; i < productIds.length; i += chunk) {
      const { data, error } = await supabaseAdmin
        .from("product_variants")
        .select("id, sort_order")
        .in("product_id", productIds.slice(i, i + chunk));
      // Migration 20261119 not applied yet: keep the old order.
      if (error) return {};
      for (const row of (data ?? []) as { id: string; sort_order: number | null }[]) {
        if (typeof row.sort_order === "number") order[row.id] = row.sort_order;
      }
    }
  } catch {
    return {};
  }
  return order;
}
