"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import {
  uploadPromoBannerImage,
  deletePromoBannerImage,
  PROMO_BANNER_BUCKET,
} from "@/lib/utils/promoBannerImageStorage";
import { promoBannerFieldsSchema, type PromoBannerFieldsType } from "@/lib/schema/promoBanner.schema";
import type { PromoBanner } from "@/lib/types/promoBanner";

export async function updatePromoBanner(
  bannerId: string,
  fields: PromoBannerFieldsType,
  file: File | null,
): Promise<{ success: true; banner: PromoBanner } | { success: false; error: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  // bannerId is caller-supplied — only allow editing a banner that actually
  // belongs to the caller's own store.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("store_promo_banners")
    .select("id, store_id, image_url")
    .eq("id", bannerId)
    .maybeSingle();

  if (fetchError || !existing) return { success: false, error: "Banner not found" };
  if (existing.store_id !== storeId) return { success: false, error: "You do not have permission to edit this banner" };

  const payload = promoBannerFieldsSchema.parse(fields);

  let imageUrl = existing.image_url;
  let uploadedPath: string | null = null;

  if (file) {
    try {
      const uploaded = await uploadPromoBannerImage(file, storeId);
      imageUrl = uploaded.url;
      uploadedPath = uploaded.path;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to upload banner image" };
    }
  }

  const { data, error } = await supabaseAdmin
    .from("store_promo_banners")
    .update({
      image_url: imageUrl,
      headline: payload.headline ?? null,
      subtext: payload.subtext ?? null,
      button_text: payload.button_text ?? null,
      button_link: payload.button_link ?? null,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bannerId)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    if (uploadedPath) await supabaseAdmin.storage.from(PROMO_BANNER_BUCKET).remove([uploadedPath]);
    return { success: false, error: error?.message ?? "Failed to update banner" };
  }

  // Only remove the old file once the new row is safely saved, and only if
  // the image actually changed.
  if (file) await deletePromoBannerImage(existing.image_url);

  return { success: true, banner: data as PromoBanner };
}
