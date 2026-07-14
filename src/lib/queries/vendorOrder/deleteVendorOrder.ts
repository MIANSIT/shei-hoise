"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Only draft orders can be deleted — a confirmed order already moved real
// stock, so removing it would silently desync warehouse/vendor inventory.
export async function deleteVendorOrder(
  id: string,
  storeId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("vendor_orders")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId)
      .eq("status", "draft")
      .select("id");

    if (error) {
      console.error("Error deleting vendor order:", error.message);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("Exception in deleteVendorOrder:", err);
    return false;
  }
}
