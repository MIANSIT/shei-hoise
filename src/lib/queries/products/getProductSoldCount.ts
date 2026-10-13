"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

interface SoldRow {
  quantity: number | null;
}

/**
 * Total units of a product sold across all its orders (every variant),
 * excluding cancelled and returned orders. Bundle component lines count
 * toward the component product, since that is stock actually sold.
 * Read with the admin client so the public storefront gets a number
 * without exposing order rows.
 * @param productId - products.id
 * @returns Units sold
 */
export async function getProductSoldCount(productId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("quantity, orders!inner(status)")
    .eq("product_id", productId)
    .not("orders.status", "in", "(cancelled,returned)");

  if (error) throw new Error(error.message);

  return ((data ?? []) as SoldRow[]).reduce(
    (sum, row) => sum + (row.quantity ?? 0),
    0,
  );
}
