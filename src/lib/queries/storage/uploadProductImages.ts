import { supabaseAdmin } from "@/lib/supabase";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ProductImageType } from "@/lib/schema/productImageSchema";

/**
 * Extracts the storage file path from a Supabase public URL.
 * Handles both formats:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>?...
 */
function extractStoragePath(
  publicUrl: string,
  bucketName: string,
): string | null {
  try {
    const url = new URL(publicUrl);
    // pathname looks like: /storage/v1/object/public/<bucket>/<file-path>
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

const BUCKET = "shei-hoise-product";

export async function uploadOrUpdateProductImages(
  storeId: string,
  productId: string,
  images: (FrontendImage & { variantId?: string; isPrimary?: boolean })[],
) {
  if (!images || images.length === 0) return [];

  const imagesToSave = images.slice(0, 5); // max 5 images

  // 1️⃣ Fetch existing images from DB
  const { data: existingImages, error: fetchError } = await supabaseAdmin
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");

  if (fetchError) throw fetchError;

  // 2️⃣ Find images that are no longer used (replaced or removed)
  const incomingUrls = new Set(imagesToSave.map((i) => i.imageUrl));

  const removedImages =
    existingImages?.filter((ex) => !incomingUrls.has(ex.image_url)) ?? [];

  if (removedImages.length > 0) {
    // Delete files from storage
    const pathsToDelete: string[] = [];

    for (const img of removedImages) {
      const filePath = extractStoragePath(img.image_url, BUCKET);
      if (filePath) {
        pathsToDelete.push(filePath);
      } else {
        console.warn(`⚠️ Could not parse storage path for: ${img.image_url}`);
      }
    }

    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove(pathsToDelete);

      if (storageError) {
        // Log but don't throw — still clean up DB record
        console.error("⚠️ Storage deletion error:", storageError);
      }
    }

    // Delete DB records
    const { error: dbDeleteError } = await supabaseAdmin
      .from("product_images")
      .delete()
      .in(
        "id",
        removedImages.map((i) => i.id),
      );

    if (dbDeleteError) throw dbDeleteError;
  }

  // 3️⃣ Prepare final images array
  const finalImages: ProductImageType[] = [];

  for (let i = 0; i < imagesToSave.length; i++) {
    const img = imagesToSave[i];
    let imageUrl = img.imageUrl;

    const existingImage = existingImages?.find(
      (ex) => ex.image_url === img.imageUrl,
    );

    // Upload new images (blob URLs = newly added files)
    if (!existingImage && img.imageUrl.startsWith("blob:")) {
      const response = await fetch(img.imageUrl);
      const blob = await response.blob();
      const filePath = `${storeId}/${productId}-${Date.now()}-${i}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, blob, { contentType: blob.type || "image/png" });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    finalImages.push({
      id: existingImage?.id || crypto.randomUUID(),
      product_id: productId,
      variant_id: img.variantId,
      image_url: imageUrl,
      alt_text: img.altText,
      sort_order: i,
      is_primary: i === 0, // first image is always primary
    });
  }

  // 4️⃣ Upsert all images
  const { error: upsertError } = await supabaseAdmin
    .from("product_images")
    .upsert(finalImages, { onConflict: "id" });

  if (upsertError) throw upsertError;

  return finalImages;
}
