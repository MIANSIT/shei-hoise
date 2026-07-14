import { supabase } from "@/lib/supabase";
import type { VendorOrderableProduct } from "@/lib/types/vendor/type";

interface DbInventory {
  quantity_available: number;
}

interface DbVariant {
  id: string;
  variant_name: string;
  sku: string | null;
  base_price: number;
  tp_price: number | null;
  is_active: boolean;
  product_inventory: DbInventory[];
}

interface DbProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number;
  tp_price: number | null;
  product_inventory: DbInventory[];
  product_variants: DbVariant[];
}

// Flattens each product into one orderable row per sellable unit: the base
// product itself (when it has no variants) or one row per active variant.
// This mirrors how the product picker on a vendor order needs to present
// choices — each row carries its own warehouse stock and TP.
export async function getVendorOrderableProducts(
  storeId: string,
  search?: string,
): Promise<VendorOrderableProduct[]> {
  if (!storeId) return [];

  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      base_price,
      tp_price,
      product_inventory(quantity_available),
      product_variants(
        id,
        variant_name,
        sku,
        base_price,
        tp_price,
        is_active,
        product_inventory(quantity_available)
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("status", "active")
    .limit(50);

  if (search?.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching vendor-orderable products:", error.message);
    return [];
  }

  const rows: VendorOrderableProduct[] = [];

  for (const product of (data as unknown as DbProduct[]) ?? []) {
    if (product.product_variants?.length) {
      for (const variant of product.product_variants) {
        if (!variant.is_active) continue;
        rows.push({
          product_id: product.id,
          variant_id: variant.id,
          product_name: product.name,
          variant_name: variant.variant_name,
          sku: variant.sku,
          warehouse_stock: variant.product_inventory?.[0]?.quantity_available ?? 0,
          tp_price: variant.tp_price ?? 0,
          base_price: variant.base_price,
        });
      }
    } else {
      rows.push({
        product_id: product.id,
        variant_id: null,
        product_name: product.name,
        variant_name: null,
        sku: product.sku,
        warehouse_stock: product.product_inventory?.[0]?.quantity_available ?? 0,
        tp_price: product.tp_price ?? 0,
        base_price: product.base_price,
      });
    }
  }

  return rows;
}
