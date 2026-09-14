"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import type { PromoBanner } from "@/lib/types/promoBanner";

/** All of the caller's own promo banners (active + inactive), for the Storefront Design admin list. */
export async function getPromoBannersForAdmin(): Promise<PromoBanner[]> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return [];

  const { data, error } = await supabaseAdmin
    .from("store_promo_banners")
    .select("*")
    .eq("store_id", storeResult.storeId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PromoBanner[];
}
