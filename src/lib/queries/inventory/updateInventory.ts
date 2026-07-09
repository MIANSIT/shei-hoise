"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface InventoryTarget {
  product_id: string;
  variant_id?: string | null;
  reason?: string;
  note?: string | null;
  created_by?: string | null;
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
}: InventoryTarget & { quantity_available: number }) {
  const { data, error } = await supabaseAdmin.rpc("set_inventory", {
    p_product_id: product_id,
    p_variant_id: variant_id,
    p_quantity: quantity_available,
    p_reason: reason,
    p_note: note,
    p_created_by: created_by,
  });

  if (error) {
    console.error("Failed to set inventory:", error);
    throw new Error(error.message);
  }

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
}: InventoryTarget & { delta: number }) {
  const { data, error } = await supabaseAdmin.rpc("adjust_inventory", {
    p_product_id: product_id,
    p_variant_id: variant_id,
    p_delta: delta,
    p_reason: reason,
    p_note: note,
    p_created_by: created_by,
  });

  if (error) {
    console.error("Failed to adjust inventory:", error);
    throw new Error(error.message);
  }

  return data;
}
