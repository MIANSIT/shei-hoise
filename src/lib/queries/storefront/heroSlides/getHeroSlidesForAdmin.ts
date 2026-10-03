"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { HeroSlide } from "@/lib/types/heroSlide";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

/** All of the caller's own slides (active + inactive), for the Storefront Design admin list. */
export async function getHeroSlidesForAdmin(): Promise<HeroSlide[]> {
  const storeResult = await getAuthorizedStoreId("storefront.view");
  if (!storeResult.ok) return [];

  const { data, error } = await supabaseAdmin
    .from("store_hero_slides")
    .select("*")
    .eq("store_id", storeResult.storeId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as HeroSlide[];
}
