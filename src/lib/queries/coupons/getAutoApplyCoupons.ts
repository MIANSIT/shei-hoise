"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Coupon } from "@/lib/types/coupon";

/**
 * Public: every currently-live coupon the store owner flagged `auto_apply`.
 * Independent of `show_on_storefront` — an auto-apply coupon needs no code
 * shown to the customer. Same live-window checks as getLiveStorefrontCoupons;
 * min order / per-customer limits are still enforced by validateCoupon, both
 * for the checkout preview and again inside createCustomerOrder.
 */
export async function getAutoApplyCoupons(storeId: string): Promise<Coupon[]> {
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("auto_apply", true);

  if (error) {
    console.error("Error fetching auto-apply coupons:", error.message);
    return [];
  }
  if (!data) return [];

  const now = Date.now();
  return (data as Coupon[]).filter((coupon) => {
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return false;
    if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return false;
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) return false;
    return true;
  });
}
