"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PromoBanner } from "@/lib/types/promoBanner";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

/** All of the caller's own promo banners (active + inactive), for the Storefront Design admin list. */
export async function getPromoBannersForAdmin(): Promise<PromoBanner[]> {
  const storeResult = await getAuthorizedStoreId("storefront.view");
  if (!storeResult.ok) return [];

  const { data, error } = await supabaseAdmin
    .from("store_promo_banners")
    .select("*")
    .eq("store_id", storeResult.storeId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PromoBanner[];
}
