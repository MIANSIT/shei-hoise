"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { deleteHeroSlideImage } from "@/lib/utils/heroSlideImageStorage";

export async function deleteHeroSlide(slideId: string): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("store_hero_slides")
    .select("id, store_id, image_url")
    .eq("id", slideId)
    .maybeSingle();

  if (fetchError || !existing) return { success: false, error: "Slide not found" };
  if (existing.store_id !== storeResult.storeId) {
    return { success: false, error: "You do not have permission to delete this slide" };
  }

  const { error } = await supabaseAdmin
    .from("store_hero_slides")
    .delete()
    .eq("id", slideId)
    .eq("store_id", storeResult.storeId);

  if (error) return { success: false, error: error.message };

  await deleteHeroSlideImage(existing.image_url);

  return { success: true };
}
