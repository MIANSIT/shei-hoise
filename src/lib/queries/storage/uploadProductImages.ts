import { supabaseAdmin } from "@/lib/supabase";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ProductImageType } from "@/lib/schema/productImageSchema";

export async function uploadOrUpdateProductImages(
  storeId: string,
  productId: string,
  images: (FrontendImage & { variantId?: string; isPrimary?: boolean })[],
) {
  if (!images || images.length === 0) return [];

  const imagesToSave = images.slice(0, 5); // max 5 images

  // 1️⃣ Fetch existing images from DB
  const { data: existingImages } = await supabaseAdmin
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");

  // 2️⃣ Remove deleted images
  const removedImages = existingImages?.filter(
    (ex) => !imagesToSave.some((i) => i.imageUrl === ex.image_url),
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

  // 3️⃣ Prepare final images array
  const finalImages: ProductImageType[] = [];

  for (let i = 0; i < imagesToSave.length; i++) {
    const img = imagesToSave[i];
    let imageUrl = img.imageUrl;

    const existingImage = existingImages?.find(
      (ex) => ex.image_url === img.imageUrl,
    );

    // Upload new images (blob)
    if (!existingImage && img.imageUrl.startsWith("blob:")) {
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
    }

    finalImages.push({
      id: existingImage?.id || crypto.randomUUID(), // ✅ generate id for new images
      product_id: productId,
      variant_id: img.variantId,
      image_url: imageUrl,
      alt_text: img.altText,
      sort_order: i, // order based on array
      is_primary: i === 0, // first image = primary
    });
  }

  // 4️⃣ Ensure exactly one primary image
  if (!finalImages.some((img) => img.is_primary) && finalImages.length > 0) {
    finalImages[0].is_primary = true;
  }

  // 5️⃣ Upsert all images
  const { error: upsertError } = await supabaseAdmin
    .from("product_images")
    .upsert(finalImages, { onConflict: "id" }); // id must exist
  if (upsertError) throw upsertError;

  return finalImages;
}
