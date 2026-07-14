import { supabase } from "@/lib/supabase";
import type { VendorStockRow } from "@/lib/types/vendor/type";

interface DbVendorStockRow {
  id: string;
  vendor_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_available: number;
  last_vendor_tp: number | null;
  updated_at: string;
  product: { name: string; sku: string | null } | null;
  variant: { variant_name: string; sku: string | null } | null;
}

// Current stock pool held by a vendor, one row per product/variant. Rows
// with quantity_available = 0 are included by default (needed to settle
// a fully-sold-out product) — pass onlyInStock to hide them for pickers.
export async function getVendorStock(
  vendorId: string,
  onlyInStock = false,
): Promise<VendorStockRow[]> {
  let query = supabase
    .from("vendor_stock")
    .select(
      `
      id, vendor_id, product_id, variant_id, quantity_available, last_vendor_tp, updated_at,
      product:products(name, sku),
      variant:product_variants(variant_name, sku)
    `,
    )
    .eq("vendor_id", vendorId)
    .order("updated_at", { ascending: false });

  if (onlyInStock) {
    query = query.gt("quantity_available", 0);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching vendor stock:", error.message);
    return [];
  }

  return ((data as unknown as DbVendorStockRow[]) ?? []).map((row) => ({
    id: row.id,
    vendor_id: row.vendor_id,
    product_id: row.product_id,
    variant_id: row.variant_id,
    product_name: row.variant?.variant_name
      ? `${row.product?.name ?? ""} — ${row.variant.variant_name}`
      : (row.product?.name ?? ""),
    sku: row.variant?.sku ?? row.product?.sku ?? null,
    quantity_available: row.quantity_available,
    last_vendor_tp: row.last_vendor_tp,
    updated_at: row.updated_at,
  }));
}
