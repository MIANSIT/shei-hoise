"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteCoupon(id: string, storeId: string): Promise<boolean> {
  try {
    // A coupon that's already been redeemed carries order history via
    // coupon_redemptions — deleting it would cascade-wipe that history, so
    // block it the same way deleteVendor blocks deleting a vendor with
    // existing orders. Deactivate (is_active: false) instead.
    const { count: redemptionCount } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", id);

    if (redemptionCount && redemptionCount > 0) {
      console.error(
        "Cannot delete coupon: it has already been redeemed. Deactivate it instead.",
      );
      return false;
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId)
      .select("id");

    if (error) {
      console.error("Error deleting coupon:", error.message);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("Exception in deleteCoupon:", err);
    return false;
  }
}
