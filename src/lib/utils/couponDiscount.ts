import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon } from "@/lib/types/coupon";

/**
 * Display-only mirror of the discount maths in validateCoupon (which is a
 * "use server" file and so can't export a sync helper). Used for the product
 * page's "price with coupon" preview; the real discount is always recomputed
 * server-side at checkout.
 */
export function computeCouponDiscount(coupon: Coupon, subtotal: number): number {
  let discount =
    coupon.discount_type === CouponDiscountType.PERCENTAGE
      ? (subtotal * coupon.discount_value) / 100
      : coupon.discount_value;
  if (coupon.max_discount_amount !== null) {
    discount = Math.min(discount, coupon.max_discount_amount);
  }
  discount = Math.min(discount, subtotal);
  return Math.round(discount * 100) / 100;
}
