"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateCouponSchema, type UpdateCouponType } from "@/lib/schema/coupon.schema";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import type { Coupon } from "@/lib/types/coupon";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- _storeId is caller-supplied and never trusted; the real store is resolved from the session below
export async function updateCoupon(
  data: UpdateCouponType,
  _storeId: string,
): Promise<Coupon | null> {
  const payload = updateCouponSchema.parse(data);
  const { id, ...rest } = payload;

  // storeId is caller-supplied — never trust it for authorization. This uses
  // the service-role client below, which bypasses RLS entirely, so this is
  // the only thing standing between one store and another store's coupons.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const storeId = storeResult.storeId;

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

  // Reactivating an inactive coupon raises the store's active-coupon count
  // exactly like creating a new one would, but only createCoupon.ts checked
  // max_coupons — editing (including flipping is_active back on) never did,
  // letting a store at its cap bypass it by reactivating an old coupon
  // instead of creating a fresh one. Only re-check on that specific
  // false -> true transition; every other edit (including deactivating)
  // behaves exactly as before.
  if (rest.is_active) {
    const { data: currentRow } = await supabaseAdmin
      .from("coupons")
      .select("is_active")
      .eq("id", id)
      .eq("store_id", storeId)
      .maybeSingle();

    if (currentRow && !currentRow.is_active) {
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
    }
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
