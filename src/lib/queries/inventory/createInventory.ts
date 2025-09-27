// lib/queries/inventory/createInventory.ts
import { supabase } from "@/lib/supabase";

interface InventoryType {
  product_id: string;
  variant_id?: string;
  quantity_available?: number;
  quantity_reserved?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
}

export async function createInventory(inventory: InventoryType) {
  // Determine if this inventory is for a variant or main product
  const isVariant = !!inventory.variant_id;

  const { data, error } = await supabase
    .from("product_inventory")
    .insert([
      {
        product_id: inventory.product_id,
        variant_id: isVariant ? inventory.variant_id : null, // only assign variant_id if it's a variant
        quantity_available: inventory.quantity_available ?? 0,
        quantity_reserved: inventory.quantity_reserved ?? 0,
        low_stock_threshold: inventory.low_stock_threshold ?? 5,
        track_inventory: inventory.track_inventory ?? true,
      },
    ])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
