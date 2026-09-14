"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { uploadPromoBannerImage, PROMO_BANNER_BUCKET } from "@/lib/utils/promoBannerImageStorage";
import { promoBannerFieldsSchema, type PromoBannerFieldsType } from "@/lib/schema/promoBanner.schema";
import type { PromoBanner } from "@/lib/types/promoBanner";

// A flat cap independent of any plan-feature gate — stops an unbounded
// banner list from degrading the homepage regardless of plan, same
// reasoning as MAX_SLIDES on hero slides.
const MAX_BANNERS = 10;

export async function createPromoBanner(
  file: File,
  fields: PromoBannerFieldsType,
): Promise<{ success: true; banner: PromoBanner } | { success: false; error: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  const payload = promoBannerFieldsSchema.parse(fields);

  const { count: currentCount } = await supabaseAdmin
    .from("store_promo_banners")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if ((currentCount ?? 0) >= MAX_BANNERS) {
    return { success: false, error: `You can have up to ${MAX_BANNERS} promo banners.` };
  }

  let uploaded: { url: string; path: string };
  try {
    uploaded = await uploadPromoBannerImage(file, storeId);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to upload banner image" };
  }

  const { data: maxSort } = await supabaseAdmin
    .from("store_promo_banners")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxSort?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from("store_promo_banners")
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
    await supabaseAdmin.storage.from(PROMO_BANNER_BUCKET).remove([uploaded.path]);
    return { success: false, error: error?.message ?? "Failed to save banner" };
  }

  return { success: true, banner: data as PromoBanner };
}
