"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

// Draft and cancelled orders can be deleted safely:
// - Draft: no stock was ever moved.
// - Cancelled: stock was already reversed by cancel_vendor_order RPC.
// Confirmed orders must be cancelled first before they can be deleted.
export async function deleteVendorOrder(
  id: string,
  storeId: string,
): Promise<boolean> {
  try {
    // storeId is caller-supplied — never trust it for authorization on its
    // own. Only allow deleting orders under the session's own store.
    const storeResult = await getAuthenticatedStoreId();
    if (!storeResult.ok || storeResult.storeId !== storeId) {
      console.error("deleteVendorOrder: unauthorized store access attempt", { storeId });
      return false;
    }

    const { data, error } = await supabaseAdmin
      .from("vendor_orders")
      .delete()
      .eq("id", id)
      .eq("store_id", storeResult.storeId)
      .in("status", ["draft", "cancelled"])
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
