// src/lib/queries/products/uploadProductImages.ts
import { supabaseAdmin } from "@/lib/supabase";
import { ProductType } from "@/lib/schema/productSchema";
import { ProductImageType } from "@/lib/schema/productImageSchema";

/**
 * Uploads product images to Supabase Storage under:
 * shei-hoise-product/{storeId}/
 * and inserts records in product_images table
 *
 * If any upload or DB insert fails, it deletes uploaded files to rollback.
 */
export async function uploadProductImages(
  storeId: string,
  productId: string,
  images: ProductType["images"]
) {
  if (!images || images.length === 0) return;

  const uploadedImages: ProductImageType[] = [];
  const uploadedFilePaths: string[] = []; // track files for rollback

  // Create placeholder to ensure folder exists
  const placeholderPath = `${storeId}/.placeholder`;
  const { error: placeholderError } = await supabaseAdmin.storage
    .from("shei-hoise-product")
    .upload(placeholderPath, new Blob([""]), { upsert: true });
  if (placeholderError)
    console.warn(
      "Could not create store folder placeholder:",
      placeholderError
    );

  try {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      // Already a valid URL → use directly
      if (img.imageUrl.startsWith("http")) {
        uploadedImages.push({
          product_id: productId,
          image_url: img.imageUrl,
          alt_text: img.altText,
          sort_order: i,
          is_primary: img.isPrimary ?? i === 0,
        });
        continue;
      }

      // Convert Blob/File from blob URL
      const response = await fetch(img.imageUrl);
      const blob = await response.blob();

      // File path: bucket/storeId/productId-timestamp-index.png
      const filePath = `${storeId}/${productId}-${Date.now()}-${i}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("shei-hoise-product")
        .upload(filePath, blob, {
          contentType: blob.type || "image/png",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      uploadedFilePaths.push(filePath); // track uploaded file

      // Public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("shei-hoise-product")
        .getPublicUrl(filePath);

      uploadedImages.push({
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        alt_text: img.altText,
        sort_order: i,
        is_primary: img.isPrimary ?? i === 0,
      });
    }

    // Insert into product_images table
    const { error: insertError } = await supabaseAdmin
      .from("product_images")
      .insert(uploadedImages);

    if (insertError) throw insertError;

    return uploadedImages;
  } catch (err) {
    console.error(
      "uploadProductImages failed, rolling back uploaded files:",
      err
    );

    // Delete any files that were uploaded before failure
    for (const filePath of uploadedFilePaths) {
      try {
        await supabaseAdmin.storage
          .from("shei-hoise-product")
          .remove([filePath]);
      } catch (removeError) {
        console.error(
          "Failed to remove file during rollback:",
          filePath,
          removeError
        );
      }
    }

    throw err;
  }
}
