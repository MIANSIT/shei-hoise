"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { VendorOrderItemInput } from "@/lib/types/vendor/type";

export async function addItemsToConfirmedOrder(
  vendorOrderId: string,
  items: VendorOrderItemInput[],
  createdBy?: string | null,
): Promise<void> {
  if (!items.length) throw new Error("At least one item is required");

  const { error } = await supabaseAdmin.rpc("add_items_to_confirmed_vendor_order", {
    p_vendor_order_id: vendorOrderId,
    p_items: items.map((i) => ({
      product_id: i.product_id,
      variant_id: i.variant_id ?? "",
      quantity: i.quantity,
      original_tp: i.original_tp,
      increase_percent: i.increase_percent,
      vendor_tp: i.vendor_tp,
      mrp: i.mrp ?? "",
      product_name: i.product_name,
      sku: i.sku ?? "",
    })),
    p_created_by: createdBy || null,
  });

  if (error) throw new Error(error.message);
}
