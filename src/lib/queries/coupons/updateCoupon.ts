"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateCouponSchema, type UpdateCouponType } from "@/lib/schema/coupon.schema";
import type { Coupon } from "@/lib/types/coupon";

export async function updateCoupon(
  data: UpdateCouponType,
  storeId: string,
): Promise<Coupon | null> {
  const payload = updateCouponSchema.parse(data);
  const { id, ...rest } = payload;

  const { data: existing } = await supabaseAdmin
    .from("coupons")
    .select("id")
    .eq("store_id", storeId)
    .eq("code", rest.code)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    throw new Error(`A coupon with code "${rest.code}" already exists.`);
  }

  const { data: updated, error } = await supabaseAdmin
    .from("coupons")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating coupon:", error.message);
    return null;
  }

  return updated as Coupon;
}
