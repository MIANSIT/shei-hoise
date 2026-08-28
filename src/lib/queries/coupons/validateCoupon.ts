"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon, CouponValidationResult } from "@/lib/types/coupon";

/**
 * The single authoritative coupon check — computes the discount amount
 * server-side from a server-computed subtotal, never from anything the
 * client sends. Called twice for the same coupon on a real checkout: once
 * from the storefront for the live "Apply" preview, and once more inside
 * createCustomerOrder right before the order is inserted (the same
 * "re-check right before commit" pattern already used there for
 * stores.is_active) — this function never trusts its own earlier result.
 *
 * customerId is optional because the storefront's live preview runs before
 * guest checkout has resolved who the customer is (phone number not yet
 * submitted) — the per-customer limit is skipped in that case and only
 * becomes authoritative at the second call, inside createCustomerOrder,
 * where the customer is always resolved by then.
 */
export async function validateCoupon(
  code: string,
  storeId: string,
  serverComputedSubtotal: number,
  customerId?: string | null,
): Promise<CouponValidationResult> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, discountAmount: 0, error: "Enter a coupon code." };
  }

  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("store_id", storeId)
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) {
    console.error("Error validating coupon:", error.message);
    return { valid: false, discountAmount: 0, error: "Could not validate coupon." };
  }

  if (!coupon) {
    return { valid: false, discountAmount: 0, error: "Invalid coupon code." };
  }

  const typedCoupon = coupon as Coupon;

  if (!typedCoupon.is_active) {
    return { valid: false, discountAmount: 0, error: "This coupon is no longer active." };
  }

  const now = new Date();
  if (typedCoupon.starts_at && now < new Date(typedCoupon.starts_at)) {
    return { valid: false, discountAmount: 0, error: "This coupon is not active yet." };
  }
  if (typedCoupon.ends_at && now > new Date(typedCoupon.ends_at)) {
    return { valid: false, discountAmount: 0, error: "This coupon has expired." };
  }

  if (typedCoupon.max_uses !== null && typedCoupon.current_uses >= typedCoupon.max_uses) {
    return { valid: false, discountAmount: 0, error: "This coupon has reached its usage limit." };
  }

  if (typedCoupon.max_uses_per_customer !== null && customerId) {
    const { count: customerUses, error: customerUsesError } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", typedCoupon.id)
      .eq("customer_id", customerId);

    if (customerUsesError) {
      console.error("Error checking coupon per-customer usage:", customerUsesError.message);
      return { valid: false, discountAmount: 0, error: "Could not validate coupon." };
    }

    if ((customerUses ?? 0) >= typedCoupon.max_uses_per_customer) {
      return {
        valid: false,
        discountAmount: 0,
        error: "You've already used this coupon the maximum number of times.",
      };
    }
  }

  if (
    typedCoupon.min_order_amount !== null &&
    serverComputedSubtotal < typedCoupon.min_order_amount
  ) {
    return {
      valid: false,
      discountAmount: 0,
      error: `This coupon requires a minimum order of ৳${typedCoupon.min_order_amount}.`,
    };
  }

  let discountAmount =
    typedCoupon.discount_type === CouponDiscountType.PERCENTAGE
      ? (serverComputedSubtotal * typedCoupon.discount_value) / 100
      : typedCoupon.discount_value;

  if (typedCoupon.max_discount_amount !== null) {
    discountAmount = Math.min(discountAmount, typedCoupon.max_discount_amount);
  }
  discountAmount = Math.min(discountAmount, serverComputedSubtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { valid: true, discountAmount, coupon: typedCoupon };
}
