"use server";

import { getLiveStorefrontCoupons } from "@/lib/queries/coupons/getStorefrontCoupon";
import type { Coupon } from "@/lib/types/coupon";

/**
 * Public: every currently-live, `show_on_storefront` coupon for a store —
 * used by the checkout coupon dropdown and the storefront /coupons page.
 * Featured coupons sort first, then most recently created.
 */
export async function getStorefrontCoupons(storeId: string): Promise<Coupon[]> {
  const live = await getLiveStorefrontCoupons(storeId);
  return [...live].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
