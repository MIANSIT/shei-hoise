"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StorefrontBrand } from "@/lib/types/brand";
import { storeHasBrandsFeature } from "./brandAccess";

/**
 * The active brands a shopper sees on a store's storefront. Empty when the
 * store's plan doesn't include brands, so the storefront simply shows nothing
 * — same as a store that hasn't added any.
 */
export async function getStorefrontBrands(storeSlug: string): Promise<StorefrontBrand[]> {
  try {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("store_slug", storeSlug)
      .maybeSingle();
    if (!store) return [];

    if (!(await storeHasBrandsFeature(store.id))) return [];

    const { data, error } = await supabaseAdmin
      .from("brands")
      .select("id, name, slug, logo_url")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;

    return (data ?? []) as StorefrontBrand[];
  } catch (err) {
    // A brand strip is decoration: never let a failure here break the page.
    console.error("getStorefrontBrands failed:", err);
    return [];
  }
}
