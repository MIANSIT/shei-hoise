"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createCouponSchema, type CreateCouponType } from "@/lib/schema/coupon.schema";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import type { Coupon } from "@/lib/types/coupon";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- _storeId is caller-supplied and never trusted; the real store is resolved from the session below
export async function createCoupon(
  data: CreateCouponType,
  _storeId: string,
): Promise<Coupon> {
  const payload = createCouponSchema.parse(data);

  // storeId is caller-supplied — never trust it for authorization. This uses
  // the service-role client below, which bypasses RLS entirely, so this is
  // the only thing standing between one store and another store's coupons.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const storeId = storeResult.storeId;

  const { count: currentActiveCount } = await supabaseAdmin
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);

  const subscription = await getStoreFeatureSubscription(storeId);
  const limitCheck = checkLimit(subscription, "max_coupons", currentActiveCount ?? 0);
  if (!limitCheck.allowed) {
    throw new Error(
      `You've reached your plan's limit of ${limitCheck.limit} active coupons. Upgrade your plan to add more.`,
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("coupons")
    .select("id")
    .eq("store_id", storeId)
    .eq("code", payload.code)
    .maybeSingle();

  if (existing) {
    throw new Error(`A coupon with code "${payload.code}" already exists.`);
  }

  const { data: insertData, error } = await supabaseAdmin
    .from("coupons")
    .insert({ ...payload, store_id: storeId })
    .select("*")
    .single();

  if (error) {
    console.error("Coupon insert error:", error);
    throw error;
  }

  return insertData as Coupon;
}
