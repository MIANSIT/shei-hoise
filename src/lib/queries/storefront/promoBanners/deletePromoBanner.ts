"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { deletePromoBannerImage } from "@/lib/utils/promoBannerImageStorage";

export async function deletePromoBanner(bannerId: string): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("store_promo_banners")
    .select("id, store_id, image_url")
    .eq("id", bannerId)
    .maybeSingle();

  if (fetchError || !existing) return { success: false, error: "Banner not found" };
  if (existing.store_id !== storeResult.storeId) {
    return { success: false, error: "You do not have permission to delete this banner" };
  }

  const { error } = await supabaseAdmin
    .from("store_promo_banners")
    .delete()
    .eq("id", bannerId)
    .eq("store_id", storeResult.storeId);

  if (error) return { success: false, error: error.message };

  await deletePromoBannerImage(existing.image_url);

  return { success: true };
}
