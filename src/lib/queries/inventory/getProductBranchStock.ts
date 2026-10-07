"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId } from "@/lib/permissions/server";

export type ProductBranchStockResult =
  | { success: true; product: number; variants: Record<string, number> }
  | { success: false; error: string };

/**
 * Units one branch holds of a product and each of its variants — what the
 * product edit form shows and edits for a store with branches (the store-wide
 * total would be the sum of every branch, which is not one branch's stock).
 */
export async function getProductBranchStock(
  productId: string,
  branchId: string,
): Promise<ProductBranchStockResult> {
  const auth = await getAuthorizedStoreId("products.edit");
  if (!auth.ok) return { success: false, error: auth.error };
  if (!canUseBranch(auth.actor, branchId)) return { success: false, error: BRANCH_SCOPE_ERROR };

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("store_id")
    .eq("id", productId)
    .single();
  if (!product || product.store_id !== auth.storeId) {
    return { success: false, error: "Product not found" };
  }

  const { data, error } = await supabaseAdmin
    .from("branch_inventory")
    .select("variant_id, quantity_available")
    .eq("branch_id", branchId)
    .eq("product_id", productId);
  if (error) return { success: false, error: error.message };

  let productQuantity = 0;
  const variants: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.variant_id) variants[row.variant_id] = Number(row.quantity_available ?? 0);
    else productQuantity = Number(row.quantity_available ?? 0);
  }
  return { success: true, product: productQuantity, variants };
}
