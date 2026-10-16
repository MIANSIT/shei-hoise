/**
 * Shared checks for the brand server actions (plain module, not "use server").
 * The brands table is service-role only, so this is where a store's plan is
 * enforced: no "brands" feature flag, no brand reads or writes.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature, type FeatureCheckable } from "@/lib/utils/planFeatures";
import { slugifyBrandName } from "@/lib/utils/brandSlug";
import { BRANDS_FEATURE_KEY } from "@/lib/types/brand";

export const BRANDS_NOT_IN_PLAN_ERROR = "Brands aren't included in your plan. Upgrade your plan to use them.";

export async function storeHasBrandsFeature(storeId: string): Promise<boolean> {
  const subscription = await getStoreFeatureSubscription(storeId);
  return hasFeature(subscription, BRANDS_FEATURE_KEY);
}

/**
 * What to write to products.brand_id for a product save, given what the form sent.
 * - undefined: leave the column alone (plan has no brands, or the form didn't send one)
 * - null: clear the brand
 * - a brand id: set it — only ever a brand of this same store
 * The form's value is caller-supplied, so a plan without brands drops it and a
 * brand from another store is rejected.
 */
export async function resolveProductBrandId(
  storeId: string,
  subscription: FeatureCheckable | null,
  brandId: string | null | undefined,
): Promise<string | null | undefined> {
  if (brandId === undefined) return undefined;
  if (!hasFeature(subscription, BRANDS_FEATURE_KEY)) return undefined;
  if (brandId === null || brandId === "") return null;

  const { data } = await supabaseAdmin
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) throw new Error("The brand you picked no longer exists. Choose another brand and try again.");
  return data.id as string;
}

/** A slug for `name` that no other brand in the store uses ("cozie", "cozie-2", ...). */
export async function uniqueBrandSlug(storeId: string, name: string, ignoreBrandId?: string): Promise<string> {
  const base = slugifyBrandName(name);
  const { data } = await supabaseAdmin
    .from("brands")
    .select("id, slug")
    .eq("store_id", storeId)
    .like("slug", `${base}%`);

  const taken = new Set((data ?? []).filter((b) => b.id !== ignoreBrandId).map((b) => b.slug as string));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
