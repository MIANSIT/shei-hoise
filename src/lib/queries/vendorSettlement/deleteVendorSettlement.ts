"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Undoes a mistakenly-recorded settlement — reverses the stock it moved
// (both sold and returned quantities go back to the vendor's pool; the
// returned portion also comes back out of the warehouse) and removes the
// settlement and any payment logged alongside it.
// See supabase/migrations/20260823000006_add_delete_vendor_settlement_rpc.sql.
export async function deleteVendorSettlement(
  settlementId: string,
  storeId: string,
  deletedBy?: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("delete_vendor_settlement", {
    p_settlement_id: settlementId,
    p_caller_store_id: storeId,
    p_deleted_by: deletedBy || null,
  });

  if (error) throw new Error(error.message);
}
