"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Coupon } from "@/lib/types/coupon";

/**
 * Used by getStorefrontCoupons (full list for the homepage strip, the
 * checkout dropdown, and the /coupons page): every coupon flagged
 * `show_on_storefront` that is currently live. This is a teaser only — the
 * actual "is this still valid for my cart" check happens at checkout via
 * validateCoupon, which re-verifies min_order_amount/per-customer limits
 * against the real order. Here we only need the "is this coupon currently
 * live at all" window check.
 *
 * Uses supabaseAdmin rather than the anon client, matching validateCoupon.ts
 * — coupons has no public RLS read policy, so customer-facing coupon reads
 * in this codebase already go through the service-role client.
 */
export async function getLiveStorefrontCoupons(storeId: string): Promise<Coupon[]> {
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("show_on_storefront", true);

  if (error) {
    console.error("Error fetching storefront coupons:", error.message);
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
