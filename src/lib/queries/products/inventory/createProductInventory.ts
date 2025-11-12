"use client";
import { supabase } from "@/lib/supabase";

interface InventoryRecord {
  product_id: string;
  variant_id?: string; // optional for main product
  quantity_available: number;
  quantity_reserved?: number;
  track_inventory?: boolean;
}

/**
 * Create inventory records for a product and its variants
 *
 * @param productId - main product ID
 * @param variantIds - array of variant IDs
 * @param productStock - main product stock
 * @param variantStocks - array of stocks for variants
 * @param trackInventory - track inventory flag
 */
export async function createProductInventory(
  productId: string,
  variantIds: string[] = [],
  productStock = 0,
  variantStocks: number[] = [],
  trackInventory = true
) {
  try {
    const inventoryRecords: InventoryRecord[] = [];

    if (!variantIds || variantIds.length === 0) {
      // No variants → main product inventory only
      inventoryRecords.push({
        product_id: productId,
        quantity_available: productStock,
        quantity_reserved: 0,
        track_inventory: trackInventory,
      });
    } else {
      // Has variants → only variants get inventory
      variantIds.forEach((variantId, index) => {
        inventoryRecords.push({
          product_id: productId,
          variant_id: variantId,
          quantity_available: variantStocks[index] ?? 0,
          quantity_reserved: 0,
          track_inventory: trackInventory,
        });
      });
    }

    // Insert and return all inserted rows
    const { data, error } = await supabase
      .from("product_inventory")
      .insert(inventoryRecords)
      .select("*"); // <-- return full data, not just product_id

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("createProductInventory error:", err);
    throw err;
  }
}
