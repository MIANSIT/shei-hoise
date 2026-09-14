/**
 * Shared hero-slide storage helpers (not a "use server" module — a "use
 * server" file may only export async functions, and BUCKET/extractStoragePath
 * aren't; only the query files that import this run as server actions).
 *
 * Dedicated "hero-slider" bucket (public, 5MB limit — same as "category" and
 * "promo-banner"), separate from the general store-banner/logo media and
 * from promo banners' own bucket, so each concern's files live and clean up
 * independently. Path is store_id based: `<store_id>/<unique>.webp`.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicStorageUrl } from "@/lib/supabase/publicUrl";
import { optimizeImage } from "@/lib/utils/optimizeImage";

export const HERO_SLIDE_BUCKET = "hero-slider";

export function extractHeroSlideImagePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${HERO_SLIDE_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function uploadHeroSlideImage(file: File, storeId: string): Promise<{ url: string; path: string }> {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const path = `${storeId}/${uniqueId}.webp`;

  const optimized = await optimizeImage(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(HERO_SLIDE_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(HERO_SLIDE_BUCKET).getPublicUrl(path);
  return { url: toPublicStorageUrl(data.publicUrl), path };
}

/** No-op (not an error) when there's no image or its URL doesn't match this bucket's shape. */
export async function deleteHeroSlideImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  const path = extractHeroSlideImagePath(imageUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(HERO_SLIDE_BUCKET).remove([path]);
}
