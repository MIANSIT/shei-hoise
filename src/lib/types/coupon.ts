// types/coupon.ts
import { CouponDiscountType } from "./enums";

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_customer: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  title: string | null;
  is_featured: boolean;
  show_on_storefront: boolean;
  auto_apply: boolean;
  /** Empty or missing = the coupon works on every product; otherwise only on products in these categories. */
  category_ids?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  order_id: string;
  store_id: string;
  customer_id: string | null;
  discount_amount: number;
  created_at: string;
}

/** One cart line, as the coupon check sees it: the product and what the line costs in total. */
export interface CouponCartLine {
  productId: string;
  amount: number;
}

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  coupon?: Coupon;
  error?: string;
}
