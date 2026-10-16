"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { checkLimit, hasFeature } from "@/lib/utils/planFeatures";
import { BRANDS_FEATURE_KEY, BRANDS_LIMIT_KEY, type Brand } from "@/lib/types/brand";
import { BRANDS_NOT_IN_PLAN_ERROR } from "./brandAccess";

export type GetBrandsResult =
  | {
      success: true;
      brands: Brand[];
      /** Plan limit on brands; -1 means unlimited. */
      limit: number;
      /** Number of products using each brand, by brand id. */
      productCounts: Record<string, number>;
    }
  | { success: false; error: string };

/** Every brand of the caller's own store (dashboard list), with how many products use each. */
export async function getBrands(): Promise<GetBrandsResult> {
  const auth = await getAuthorizedStoreId("brands.view");
  if (!auth.ok) return { success: false, error: auth.error };
  const storeId = auth.storeId;

  const subscription = await getStoreFeatureSubscription(storeId);
  if (!hasFeature(subscription, BRANDS_FEATURE_KEY)) {
    return { success: false, error: BRANDS_NOT_IN_PLAN_ERROR };
  }

  const { data, error } = await supabaseAdmin
    .from("brands")
    .select("id, store_id, name, slug, logo_url, is_active, sort_order, created_at")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return { success: false, error: error.message };

  const brands = (data ?? []) as Brand[];

  const productCounts: Record<string, number> = {};
  if (brands.length > 0) {
    const { data: usage } = await supabaseAdmin
      .from("products")
      .select("brand_id")
      .eq("store_id", storeId)
      .not("brand_id", "is", null)
      .limit(5000);
    for (const row of usage ?? []) {
      const id = row.brand_id as string;
      productCounts[id] = (productCounts[id] ?? 0) + 1;
    }
  }

  const limit = checkLimit(subscription, BRANDS_LIMIT_KEY, brands.length).limit;
  return { success: true, brands, limit, productCounts };
}
