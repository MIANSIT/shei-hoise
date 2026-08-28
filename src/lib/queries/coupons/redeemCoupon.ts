"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface RedeemCouponInput {
  couponId: string;
  orderId: string;
  discountAmount: number;
  storeId: string;
  customerId?: string | null;
}

/**
 * Thin wrapper around the redeem_coupon() RPC (see
 * supabase/migrations/20260825000000_add_coupons.sql and
 * 20260825000003_add_coupon_per_customer_limit.sql), which locks the
 * coupon row and re-checks it — including the per-customer cap — before
 * incrementing current_uses. This is the actual commit point for a
 * coupon's usage caps, not validateCoupon's earlier preview check.
 */
export async function redeemCoupon(input: RedeemCouponInput): Promise<void> {
  const { error } = await supabaseAdmin.rpc("redeem_coupon", {
    p_coupon_id: input.couponId,
    p_order_id: input.orderId,
    p_discount_amount: input.discountAmount,
    p_store_id: input.storeId,
    p_customer_id: input.customerId ?? null,
  });

  if (error) {
    throw new Error(`Failed to redeem coupon: ${error.message}`);
  }
}
