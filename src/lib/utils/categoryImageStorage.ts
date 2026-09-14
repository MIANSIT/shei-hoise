/**
 * Shared category-image storage helpers (not a "use server" module — its
 * exports include a non-async constant and a sync helper, which "use server"
 * files aren't allowed to export; only the query files that import this run
 * as server actions).
 *
 * Path shape: `<store_id>/<category_id>/<unique>.webp` — organizes files the
 * same way the store owner asked for, and doubles as the FK-ish grouping
 * needed to find/clean up a category's image later.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicStorageUrl } from "@/lib/supabase/publicUrl";
import { optimizeImage } from "@/lib/utils/optimizeImage";

export const CATEGORY_IMAGE_BUCKET = "category";

export function extractCategoryImagePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${CATEGORY_IMAGE_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function uploadCategoryImage(
  file: File,
  storeId: string,
  categoryId: string,
): Promise<string> {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const path = `${storeId}/${categoryId}/${uniqueId}.webp`;

  const optimized = await optimizeImage(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(CATEGORY_IMAGE_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(CATEGORY_IMAGE_BUCKET).getPublicUrl(path);
  return toPublicStorageUrl(data.publicUrl);
}

/** No-op (not an error) when there's no image or its URL doesn't match this bucket's shape. */
export async function deleteCategoryImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  const path = extractCategoryImagePath(imageUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(CATEGORY_IMAGE_BUCKET).remove([path]);
}
