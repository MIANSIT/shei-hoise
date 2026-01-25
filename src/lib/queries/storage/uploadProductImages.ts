import { supabaseAdmin } from "@/lib/supabase";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ProductImageType } from "@/lib/schema/productImageSchema";

export async function uploadOrUpdateProductImages(
  storeId: string,
  productId: string,
  images: (FrontendImage & { variantId?: string; isPrimary?: boolean })[],
) {
  if (!images || images.length === 0) return [];

  const uploadedImages: ProductImageType[] = [];
  const uploadedFilePaths: string[] = [];
  const imagesToUpload = images.slice(0, 5);

  // 1️⃣ Fetch existing images from DB
  const { data: existingImages } = await supabaseAdmin
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");

  // 2️⃣ Remove deleted images
  const removedImages = existingImages?.filter(
    (ex) => !imagesToUpload.some((i) => i.imageUrl === ex.image_url),
  );

  if (removedImages?.length) {
    for (const img of removedImages) {
      const filePath = img.image_url.split("/storage/v1/object/public/")[1];
      if (filePath) {
        await supabaseAdmin.storage
          .from("shei-hoise-product")
          .remove([filePath]);
      }
    }

    await supabaseAdmin
      .from("product_images")
      .delete()
      .in(
        "id",
        removedImages.map((i) => i.id),
      );
  }

  // 3️⃣ Handle new uploads
  for (let i = 0; i < imagesToUpload.length; i++) {
    const img = imagesToUpload[i];
    let imageUrl = img.imageUrl;

    const alreadyExists = existingImages?.some(
      (ex) => ex.image_url === img.imageUrl,
    );
    if (!alreadyExists) {
      if (img.imageUrl.startsWith("blob:")) {
        const response = await fetch(img.imageUrl);
        const blob = await response.blob();
        const filePath = `${storeId}/${productId}-${Date.now()}-${i}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("shei-hoise-product")
          .upload(filePath, blob, { contentType: blob.type || "image/png" });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("shei-hoise-product")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
        uploadedFilePaths.push(filePath);
      }

      uploadedImages.push({
        product_id: productId,
        variant_id: img.variantId,
        image_url: imageUrl,
        alt_text: img.altText,
        sort_order: 0, // will be corrected
        is_primary: img.isPrimary ?? false,
      });
    }
  }

  // 4️⃣ Combine remaining existing images + new uploads
  const remainingExistingImages =
    existingImages?.filter((ex) =>
      imagesToUpload.some((i) => i.imageUrl === ex.image_url),
    ) || [];

  const finalImages = [...remainingExistingImages, ...uploadedImages];

  // 5️⃣ Ensure exactly one primary image
  const primaryExists = finalImages.some((img) => img.is_primary);
  if (!primaryExists && finalImages.length > 0) {
    finalImages[0].is_primary = true;
  }

  // 6️⃣ Update sort_order
  finalImages.forEach((img, index) => {
    img.sort_order = index;
  });

  // 7️⃣ Upsert all images
  const { error: upsertError } = await supabaseAdmin
    .from("product_images")
    .upsert(finalImages, { onConflict: "id" });

  if (upsertError) throw upsertError;

  return finalImages;
}
