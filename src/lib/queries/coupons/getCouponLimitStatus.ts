"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";

export interface CouponLimitStatus {
  current: number;
  limit: number;
  allowed: boolean;
}

/** For the dashboard's "X of Y active coupons used" display and the Create button's disabled state. */
export async function getCouponLimitStatus(storeId: string): Promise<CouponLimitStatus> {
  const { count } = await supabaseAdmin
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);

  const subscription = await getStoreFeatureSubscription(storeId);
  const { allowed, limit, current } = checkLimit(subscription, "max_active_coupons", count ?? 0);

  return { current, limit, allowed };
}
