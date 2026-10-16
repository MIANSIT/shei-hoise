/**
 * Brand-logo storage helpers (plain module, not "use server" — see
 * categoryImageStorage.ts for why). Logos live in the existing category image
 * bucket under `<store_id>/brands/<brand_id>/<unique>.webp`, so no separate
 * bucket has to be created.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicStorageUrl } from "@/lib/supabase/publicUrl";
import { optimizeImage } from "@/lib/utils/optimizeImage";
import { CATEGORY_IMAGE_BUCKET, extractCategoryImagePath } from "@/lib/utils/categoryImageStorage";
import { MAX_BRAND_LOGO_BYTES } from "@/lib/types/brand";

export async function uploadBrandLogo(file: File, storeId: string, brandId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("The logo must be an image file.");
  if (file.size > MAX_BRAND_LOGO_BYTES) throw new Error("The logo is too large. Use an image under 4 MB.");

  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const path = `${storeId}/brands/${brandId}/${uniqueId}.webp`;

  const optimized = await optimizeImage(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(CATEGORY_IMAGE_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(CATEGORY_IMAGE_BUCKET).getPublicUrl(path);
  return toPublicStorageUrl(data.publicUrl);
}

/** No-op (not an error) when there's no logo or its URL doesn't match the bucket's shape. */
export async function deleteBrandLogo(logoUrl: string | null | undefined): Promise<void> {
  if (!logoUrl) return;
  const path = extractCategoryImagePath(logoUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(CATEGORY_IMAGE_BUCKET).remove([path]);
}
