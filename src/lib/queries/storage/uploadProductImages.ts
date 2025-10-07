import { supabaseAdmin } from "@/lib/supabase";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ProductImageType } from "@/lib/schema/productImageSchema";

export async function uploadOrUpdateProductImages(
  storeId: string,
  productId: string,
  images: (FrontendImage & { variantId?: string })[]
) {
  if (!images || images.length === 0) return [];

  const uploadedImages: ProductImageType[] = [];
  const uploadedFilePaths: string[] = [];
  const imagesToUpload = images.slice(0, 5);

  // 1️⃣ Fetch existing images from DB
  const { data: existingImages } = await supabaseAdmin
    .from("product_images")
    .select("id, image_url")
    .eq("product_id", productId);

  try {
    for (let i = 0; i < imagesToUpload.length; i++) {
      const img = imagesToUpload[i];

      // 2️⃣ Skip if image already exists
      const alreadyExists = existingImages?.some(
        (ex) => ex.image_url === img.imageUrl
      );
      if (alreadyExists) continue;

      // 3️⃣ Handle new blob/image upload
      let imageUrl = img.imageUrl;

      if (img.imageUrl.startsWith("blob:")) {
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

        imageUrl = publicUrlData.publicUrl;
      }

      uploadedImages.push({
        product_id: productId,
        variant_id: img.variantId,
        image_url: imageUrl,
        alt_text: img.altText,
        sort_order: i,
        is_primary: i === 0,
      });
    }

    // 4️⃣ Insert only new images
    if (uploadedImages.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("product_images")
        .insert(uploadedImages);

      if (insertError) throw insertError;
    }

    return uploadedImages;
  } catch (err) {
    console.error("Failed to upload images:", err);
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
