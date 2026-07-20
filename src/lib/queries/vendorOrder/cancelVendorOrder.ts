"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Cancels a confirmed vendor order by reversing all stock:
// vendor_stock → product_inventory for every line item.
// Only confirmed orders can be cancelled — draft orders should be deleted instead.
export async function cancelVendorOrder(
  vendorOrderId: string,
  cancelledBy?: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("cancel_vendor_order", {
    p_vendor_order_id: vendorOrderId,
    p_cancelled_by: cancelledBy || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
