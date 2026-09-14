"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import {
  uploadHeroSlideImage,
  deleteHeroSlideImage,
  HERO_SLIDE_BUCKET,
} from "@/lib/utils/heroSlideImageStorage";
import { heroSlideFieldsSchema, type HeroSlideFieldsType } from "@/lib/schema/heroSlide.schema";
import type { HeroSlide } from "@/lib/types/heroSlide";

export async function updateHeroSlide(
  slideId: string,
  fields: HeroSlideFieldsType,
  file: File | null,
): Promise<{ success: true; slide: HeroSlide } | { success: false; error: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  // slideId is caller-supplied — only allow editing a slide that actually
  // belongs to the caller's own store.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("store_hero_slides")
    .select("id, store_id, image_url")
    .eq("id", slideId)
    .maybeSingle();

  if (fetchError || !existing) return { success: false, error: "Slide not found" };
  if (existing.store_id !== storeId) return { success: false, error: "You do not have permission to edit this slide" };

  const payload = heroSlideFieldsSchema.parse(fields);

  let imageUrl = existing.image_url;
  let uploadedPath: string | null = null;

  if (file) {
    try {
      const uploaded = await uploadHeroSlideImage(file, storeId);
      imageUrl = uploaded.url;
      uploadedPath = uploaded.path;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to upload slide image" };
    }
  }

  const { data, error } = await supabaseAdmin
    .from("store_hero_slides")
    .update({
      image_url: imageUrl,
      headline: payload.headline ?? null,
      subtext: payload.subtext ?? null,
      button_text: payload.button_text ?? null,
      button_link: payload.button_link ?? null,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slideId)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    if (uploadedPath) await supabaseAdmin.storage.from(HERO_SLIDE_BUCKET).remove([uploadedPath]);
    return { success: false, error: error?.message ?? "Failed to update slide" };
  }

  // Only remove the old file once the new row is safely saved, and only if
  // the image actually changed.
  if (file) await deleteHeroSlideImage(existing.image_url);

  return { success: true, slide: data as HeroSlide };
}
