"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BRANCH_SCOPE_ERROR,
  canUseBranch,
  checkStockAdjustmentLimit,
  getAuthorizedStoreId,
  logActivity,
  type Actor,
} from "@/lib/permissions/server";

interface InventoryTarget {
  product_id: string;
  variant_id?: string | null;
  /**
   * Change one branch's stock (stores with branches). Without it the
   * store-wide row changes, which the database spreads over the branches.
   */
  branch_id?: string | null;
  reason?: string;
  note?: string | null;
  created_by?: string | null;
}

// product_inventory has no store_id of its own — confirm the product it's
// tied to actually belongs to the caller's store before adjusting/setting
// its stock, and hand the verified store back so it can also be passed to
// the RPC for a second, database-level check.
async function requireOwnedProductStoreId(
  productId: string,
): Promise<{ storeId: string; actor: Actor; productName: string }> {
  const storeResult = await getAuthorizedStoreId("stock.edit");
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("store_id, name")
    .eq("id", productId)
    .single();

  if (error || !product || product.store_id !== storeResult.storeId) {
    throw new Error("You do not have permission to modify this product's inventory");
  }

  return { storeId: storeResult.storeId, actor: storeResult.actor, productName: product.name };
}

async function currentAvailable(
  productId: string,
  variantId: string | null,
  branchId: string | null = null,
): Promise<number> {
  const query = branchId
    ? supabaseAdmin
        .from("branch_inventory")
        .select("quantity_available")
        .eq("branch_id", branchId)
        .eq("product_id", productId)
    : supabaseAdmin.from("product_inventory").select("quantity_available").eq("product_id", productId);
  const { data } = await (variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null)).maybeSingle();
  return Number(data?.quantity_available ?? 0);
}

function assertBranchAccess(actor: Actor, branchId: string | null | undefined): void {
  if (branchId && !canUseBranch(actor, branchId)) throw new Error(BRANCH_SCOPE_ERROR);
}

/**
 * Atomically sets inventory to an absolute quantity (row-locked server-side),
 * logging the change to stock_movements. Use for deliberate recounts/stocktakes
 * where the target number should win outright regardless of the current value.
 */
export async function updateInventory({
  product_id,
  variant_id = null,
  quantity_available,
  reason = "recount",
  note = null,
  created_by = null,
  branch_id = null,
}: InventoryTarget & { quantity_available: number }) {
  const { storeId, actor, productName } = await requireOwnedProductStoreId(product_id);
  assertBranchAccess(actor, branch_id);

  // A recount is still a change of (new - current) units for the role's limit.
  const before = await currentAvailable(product_id, variant_id, branch_id);
  const limited = checkStockAdjustmentLimit(actor, quantity_available - before);
  if (limited) throw new Error(limited);

  const { data, error } = await supabaseAdmin.rpc(branch_id ? "set_branch_inventory" : "set_inventory", {
    ...(branch_id ? { p_branch_id: branch_id } : {}),
    p_product_id: product_id,
    p_variant_id: variant_id,
    p_quantity: quantity_available,
    p_reason: reason,
    p_note: note,
    p_created_by: created_by ?? actor.userId,
    p_caller_store_id: storeId,
  });

  if (error) {
    console.error("Failed to set inventory:", error);
    throw new Error(error.message);
  }

  await logActivity(actor, {
    action: "stock.edit",
    entityType: "product",
    entityId: product_id,
    summary: `${productName}: ${before} → ${quantity_available} (${reason})`,
    details: { variant_id, branch_id, note },
  });

  return data;
}

/**
 * Atomically applies a relative change (+/-) to inventory (row-locked
 * server-side), so concurrent adjustments always sum correctly instead of
 * one overwrite discarding another. Logs the change to stock_movements.
 */
export async function adjustInventory({
  product_id,
  variant_id = null,
  delta,
  reason = "manual_adjustment",
  note = null,
  created_by = null,
  branch_id = null,
}: InventoryTarget & { delta: number }) {
  const { storeId, actor, productName } = await requireOwnedProductStoreId(product_id);
  assertBranchAccess(actor, branch_id);

  const limited = checkStockAdjustmentLimit(actor, delta);
  if (limited) throw new Error(limited);

  const { data, error } = await supabaseAdmin.rpc(branch_id ? "adjust_branch_inventory" : "adjust_inventory", {
    ...(branch_id ? { p_branch_id: branch_id } : {}),
    p_product_id: product_id,
    p_variant_id: variant_id,
    p_delta: delta,
    p_reason: reason,
    p_note: note,
    p_created_by: created_by ?? actor.userId,
    p_caller_store_id: storeId,
  });

  if (error) {
    console.error("Failed to adjust inventory:", error);
    throw new Error(error.message);
  }

  await logActivity(actor, {
    action: "stock.edit",
    entityType: "product",
    entityId: product_id,
    summary: `${productName}: ${delta > 0 ? "+" : ""}${delta} (${reason})`,
    details: { variant_id, branch_id, note },
  });

  return data;
}
