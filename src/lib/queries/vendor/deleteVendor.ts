"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { authorizeForStore, logDeleted } from "@/lib/permissions/server";

export async function deleteVendor(
  id: string,
  storeId: string,
): Promise<boolean> {
  try {
    const auth = await authorizeForStore(storeId, "vendors.delete");
    if (!auth.ok) {
      console.error("deleteVendor:", auth.error);
      return false;
    }

    // A vendor with existing orders/stock must not be deleted (FK RESTRICT
    // on vendor_orders/vendor_settlements/vendor_payments would reject it
    // anyway) — surface that as a clear message instead of a raw PG error.
    const { count: orderCount } = await supabase
      .from("vendor_orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", id);

    if (orderCount && orderCount > 0) {
      console.error(
        "Cannot delete vendor: vendor orders exist. Set status to inactive instead.",
      );
      return false;
    }

    const { data, error } = await supabase
      .from("vendors")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId)
      .select("*");

    if (error) {
      console.error("Error deleting vendor:", error.message);
      return false;
    }

    // A delete matching 0 rows does not set `error` — check explicitly.
    if (data?.[0]) {
      await logDeleted(auth.actor, "vendors", "vendor", data[0], `Deleted vendor ${data[0].name ?? ""}`.trim());
    }
    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("Exception in deleteVendor:", err);
    return false;
  }
}
