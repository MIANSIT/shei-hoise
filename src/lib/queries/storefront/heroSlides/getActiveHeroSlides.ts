import { supabase } from "@/lib/supabase";
import type { HeroSlide } from "@/lib/types/heroSlide";

/** Public: active slides for a store's homepage carousel, ordered for display. Any anonymous visitor can call this. */
export async function getActiveHeroSlides(storeId: string): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("store_hero_slides")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  // image_url is required at insert time, but a slide is still excluded here
  // defensively if it ever ends up without one — the storefront never
  // renders a slide with no image.
  return (data as HeroSlide[]).filter((slide) => Boolean(slide.image_url));
}
