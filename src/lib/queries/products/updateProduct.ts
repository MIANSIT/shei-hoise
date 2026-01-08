// lib/queries/products/updateProduct.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { ProductUpdateType } from "@/lib/schema/productUpdateSchema";
import { ProductImageType } from "@/lib/schema/productImageSchema";

/**
 * Smartly update product, variants, inventory, and images.
 * Deleted variants will be removed from DB along with their inventory.
 */
export async function updateProduct(data: ProductUpdateType) {
  const { id, store_id, variants, images, stock, ...productData } = data;

  if (!store_id) throw new Error("Store ID is required");

  // 1️⃣ Update product table (without stock)
  const { error: productError } = await supabaseAdmin
    .from("products")
    .update(productData)
    .eq("id", id);

  if (productError) throw productError;

  // 2️⃣ Handle variants
  // Fetch existing variants
  const { data: existingVariants, error: fetchError } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_id", id);

  if (fetchError) throw fetchError;

  const existingVariantIds = existingVariants?.map((v) => v.id) || [];
  const updatedVariantIds = variants?.map((v) => v.id).filter(Boolean) || [];

  // Determine variants to delete (existing in DB but not in form)
  const variantIdsToDelete = existingVariantIds.filter(
    (id) => !updatedVariantIds.includes(id)
  );

  if (variantIdsToDelete.length > 0) {
    // Delete variants
    const { error: deleteError } = await supabaseAdmin
      .from("product_variants")
      .delete()
      .in("id", variantIdsToDelete);

    if (deleteError) throw deleteError;

    // Also delete corresponding inventory
    const { error: invDeleteError } = await supabaseAdmin
      .from("product_inventory")
      .delete()
      .in("variant_id", variantIdsToDelete);

    if (invDeleteError) throw invDeleteError;
  }

  // Update or insert remaining variants
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      const { stock: variantStock, ...variantData } = variant;

      if (variant.id) {
        // Update existing variant
        await supabaseAdmin
          .from("product_variants")
          .update(variantData)
          .eq("id", variant.id);
      } else {
        // Insert new variant
        const { data: newVariant, error: variantInsertError } =
          await supabaseAdmin
            .from("product_variants")
            .insert({ ...variantData, product_id: id })
            .select("id")
            .single();

        if (variantInsertError) throw variantInsertError;
        if (!newVariant) throw new Error("Failed to insert variant");

        variant.id = newVariant.id;
      }

      // Upsert inventory for variant
      if (variantStock !== undefined) {
        await supabaseAdmin.from("product_inventory").upsert(
          {
            product_id: id,
            variant_id: variant.id ?? null,
            quantity_available: variantStock ?? stock ?? 0,
            quantity_reserved: 0,
            track_inventory: true,
          },
          { onConflict: "product_id,variant_id" }
        );
      }
    }
  }

  // 3️⃣ Handle images
  if (images && images.length > 0) {
    // Fetch existing images
    const { data: existingImages } = await supabaseAdmin
      .from("product_images")
      .select("id, image_url")
      .eq("product_id", id);

    const uploadedImages: ProductImageType[] = [];

    // Determine images to delete
    const imageUrlsToKeep = images.map((img) => img.imageUrl);
    const imagesToDelete = existingImages?.filter(
      (img) => !imageUrlsToKeep.includes(img.image_url)
    );

    if (imagesToDelete && imagesToDelete.length > 0) {
      // Delete from storage and DB
      for (const img of imagesToDelete) {
        if (img.image_url.startsWith("https://")) {
          const fileName = img.image_url.split("/").slice(-1)[0];
          try {
            await supabaseAdmin.storage
              .from("shei-hoise-product")
              .remove([`${store_id}/${fileName}`]);
          } catch (err) {
            console.error("Failed to remove image from storage:", err);
          }
        }
      }

      await supabaseAdmin
        .from("product_images")
        .delete()
        .in(
          "id",
          imagesToDelete.map((img) => img.id)
        );
    }

    // Determine variant ID for images (optional, use first variant if exists)
    let variantIdForImages: string | null = null;
    if (variants && variants.length > 0) {
      variantIdForImages = variants[0].id ?? null;
    }

    // Insert or update images
    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      const existing = existingImages?.find(
        (ex) => ex.image_url === img.imageUrl
      );

      if (existing) {
        await supabaseAdmin
          .from("product_images")
          .update({
            alt_text: img.altText,
            sort_order: i,
            is_primary: i === 0,
            variant_id: variantIdForImages,
          })
          .eq("id", existing.id);
        continue;
      }

      // Upload new blob images
      let imageUrl = img.imageUrl;
      if (img.imageUrl.startsWith("blob:")) {
        const response = await fetch(img.imageUrl);
        const blob = await response.blob();
        const filePath = `${store_id}/${id}-${Date.now()}-${i}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("shei-hoise-product")
          .upload(filePath, blob, { contentType: blob.type || "image/png" });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = await supabaseAdmin.storage
          .from("shei-hoise-product")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }

      uploadedImages.push({
        product_id: id,
        image_url: imageUrl,
        alt_text: img.altText,
        sort_order: i,
        is_primary: i === 0,
      });
    }

    // Insert new images
    if (uploadedImages.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("product_images")
        .insert(uploadedImages);

      if (insertError) throw insertError;
    }
  }

  return true;
}
