import { supabase } from "@/lib/supabase";
import type { PromoBanner } from "@/lib/types/promoBanner";

/** Public: active promo banners for a store's homepage split section, ordered for display. Any anonymous visitor can call this. */
export async function getActivePromoBanners(storeId: string): Promise<PromoBanner[]> {
  const { data, error } = await supabase
    .from("store_promo_banners")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  // image_url is required at insert time, but a banner is still excluded
  // here defensively if it ever ends up without one — the storefront never
  // renders a banner with no image.
  return (data as PromoBanner[]).filter((banner) => Boolean(banner.image_url));
}
