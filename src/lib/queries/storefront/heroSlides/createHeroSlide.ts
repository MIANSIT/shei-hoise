"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { uploadHeroSlideImage, HERO_SLIDE_BUCKET } from "@/lib/utils/heroSlideImageStorage";
import { heroSlideFieldsSchema, type HeroSlideFieldsType } from "@/lib/schema/heroSlide.schema";
import type { HeroSlide } from "@/lib/types/heroSlide";

// A flat, generous cap independent of the plan-feature gate on this page —
// stops an unbounded slide list from degrading the homepage regardless of
// plan, similar in spirit to max_images_per_product.
const MAX_SLIDES = 10;

export async function createHeroSlide(
  file: File,
  fields: HeroSlideFieldsType,
): Promise<{ success: true; slide: HeroSlide } | { success: false; error: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  const payload = heroSlideFieldsSchema.parse(fields);

  const { count: currentCount } = await supabaseAdmin
    .from("store_hero_slides")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if ((currentCount ?? 0) >= MAX_SLIDES) {
    return { success: false, error: `You can have up to ${MAX_SLIDES} hero slides.` };
  }

  let uploaded: { url: string; path: string };
  try {
    uploaded = await uploadHeroSlideImage(file, storeId);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to upload slide image" };
  }

  const { data: maxSort } = await supabaseAdmin
    .from("store_hero_slides")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxSort?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from("store_hero_slides")
    .insert({
      store_id: storeId,
      image_url: uploaded.url,
      headline: payload.headline ?? null,
      subtext: payload.subtext ?? null,
      button_text: payload.button_text ?? null,
      button_link: payload.button_link ?? null,
      is_active: payload.is_active,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabaseAdmin.storage.from(HERO_SLIDE_BUCKET).remove([uploaded.path]);
    return { success: false, error: error?.message ?? "Failed to save slide" };
  }

  return { success: true, slide: data as HeroSlide };
}
