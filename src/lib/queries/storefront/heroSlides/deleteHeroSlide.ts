"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteHeroSlideImage } from "@/lib/utils/heroSlideImageStorage";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

export async function deleteHeroSlide(slideId: string): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthorizedStoreId("storefront.delete");
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
