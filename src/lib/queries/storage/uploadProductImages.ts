// src/lib/queries/storage/uploadProductImages.ts
import { supabaseAdmin } from "@/lib/supabase";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ProductImageType } from "@/lib/schema/productImageSchema";

export async function uploadProductImages(
  storeId: string,
  productId: string,
  images: (FrontendImage & { variantId?: string })[]
) {
  if (!images || images.length === 0) return [];

  const uploadedImages: ProductImageType[] = [];
  const uploadedFilePaths: string[] = [];

  const imagesToUpload = images.slice(0, 5); // limit to 5

  try {
    for (let i = 0; i < imagesToUpload.length; i++) {
      const img = imagesToUpload[i];

      // Case 1: Existing Supabase URL
      if (
        img.imageUrl.startsWith("http") &&
        !img.imageUrl.startsWith("blob:")
      ) {
        uploadedImages.push({
          product_id: productId,
          variant_id: img.variantId, // assign variant id or undefined
          image_url: img.imageUrl,
          alt_text: img.altText,
          sort_order: i,
          is_primary: i === 0,
        });
        continue;
      }

      // Case 2: New file (blob URL)
      const response = await fetch(img.imageUrl);
      const blob = await response.blob();

      const filePath = `${storeId}/${productId}-${Date.now()}-${i}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("shei-hoise-product")
        .upload(filePath, blob, { contentType: blob.type || "image/png" });

      if (uploadError) throw uploadError;
      uploadedFilePaths.push(filePath);

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("shei-hoise-product")
        .getPublicUrl(filePath);

      uploadedImages.push({
        product_id: productId,
        variant_id: img.variantId, // assign variant id or undefined
        image_url: publicUrlData.publicUrl,
        alt_text: img.altText,
        sort_order: i,
        is_primary: i === 0,
      });
    }

    // Insert all images in DB
    const { error: insertError } = await supabaseAdmin
      .from("product_images")
      .insert(uploadedImages);

    if (insertError) throw insertError;

    return uploadedImages;
  } catch (err) {
    console.error("Failed to upload images:", err);

    // rollback any uploaded files in storage
    for (const filePath of uploadedFilePaths) {
      try {
        await supabaseAdmin.storage
          .from("shei-hoise-product")
          .remove([filePath]);
      } catch (removeErr) {
        console.error("Failed to remove file during rollback:", removeErr);
      }
    }

    throw err;
  }
}
