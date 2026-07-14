"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Atomically transfers stock from warehouse (product_inventory) to the
// vendor's pool (vendor_stock) via the confirm_vendor_order RPC — see
// supabase/migrations/20260711000000_add_vendor_distribution_module.sql.
// Blocks (throws) if any line item exceeds current warehouse stock.
export async function confirmVendorOrder(
  vendorOrderId: string,
  createdBy?: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("confirm_vendor_order", {
    p_vendor_order_id: vendorOrderId,
    p_created_by: createdBy || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
