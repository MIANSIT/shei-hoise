/**
 * Shared promo-banner storage helpers (not a "use server" module — a "use
 * server" file may only export async functions, and BUCKET/extractStoragePath
 * aren't; only the query files that import this run as server actions).
 *
 * Dedicated "promo-banner" bucket (public, 5MB limit — same as the
 * "category" bucket), separate from hero slides' own "hero-slider" bucket
 * and from the general store-banner/logo media, so each concern's files
 * live and clean up independently. Path is store_id based:
 * `<store_id>/<unique>.webp`.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicStorageUrl } from "@/lib/supabase/publicUrl";
import { optimizeImage } from "@/lib/utils/optimizeImage";

export const PROMO_BANNER_BUCKET = "promo-banner";

export function extractPromoBannerImagePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${PROMO_BANNER_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function uploadPromoBannerImage(file: File, storeId: string): Promise<{ url: string; path: string }> {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const path = `${storeId}/${uniqueId}.webp`;

  const optimized = await optimizeImage(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(PROMO_BANNER_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(PROMO_BANNER_BUCKET).getPublicUrl(path);
  return { url: toPublicStorageUrl(data.publicUrl), path };
}

/** No-op (not an error) when there's no image or its URL doesn't match this bucket's shape. */
export async function deletePromoBannerImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  const path = extractPromoBannerImagePath(imageUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(PROMO_BANNER_BUCKET).remove([path]);
}
