"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore } from "@/lib/permissions/server";

// Deletes a standalone Record Payment entry — no side effects beyond the
// row itself (unlike a settlement or an order's upfront payment), so a
// plain guarded delete is safe. Only ever matches a genuine standalone
// payment: settlement-linked payments get removed by deleteVendorSettlement,
// and an order's upfront payment gets removed by cancelling that order —
// this must never touch either.
export async function deleteVendorPayment(
  paymentId: string,
  storeId: string,
): Promise<boolean> {
  const auth = await authorizeForStore(storeId, "vendors.delete");
  if (!auth.ok) {
    console.error("deleteVendorPayment:", auth.error);
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_payments")
    .delete()
    .eq("id", paymentId)
    .eq("store_id", storeId)
    .is("settlement_id", null)
    .is("vendor_order_id", null)
    .select("id");

  if (error) {
    console.error("Error deleting vendor payment:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
