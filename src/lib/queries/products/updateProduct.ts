// lib/queries/products/updateProduct.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { ProductUpdateType } from "@/lib/schema/productUpdateSchema";
import { ProductImageType } from "@/lib/schema/productImageSchema";

export async function updateProduct(data: ProductUpdateType) {
  const { id, store_id, variants, images, stock, ...productData } = data;

  if (!store_id) throw new Error("Store ID is required");

  /* ---------------------------
     1️⃣ Update product (NO stock)
  ---------------------------- */
  const { error: productError } = await supabaseAdmin
    .from("products")
    .update(productData)
    .eq("id", id);

  if (productError) throw productError;

  /* ---------------------------
     2️⃣ Handle Variants
  ---------------------------- */
  const { data: existingVariants, error: fetchError } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_id", id);

  if (fetchError) throw fetchError;

  const existingIds = existingVariants?.map((v) => v.id) ?? [];
  const updatedIds = variants?.map((v) => v.id).filter(Boolean) ?? [];

  const toDelete = existingIds.filter((id) => !updatedIds.includes(id));

  if (toDelete.length > 0) {
    const { error } = await supabaseAdmin
      .from("product_variants")
      .delete()
      .in("id", toDelete);

    if (error) throw error;

    await supabaseAdmin
      .from("product_inventory")
      .delete()
      .in("variant_id", toDelete);
  }

  /* ---------------------------
     3️⃣ Upsert Variants + Inventory
  ---------------------------- */
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      const { stock: variantStock, ...variantData } = variant;

      let variantId = variant.id;

      // Update or insert variant
      if (variantId) {
        const { error } = await supabaseAdmin
          .from("product_variants")
          .update(variantData)
          .eq("id", variantId);

        if (error) throw error;
      } else {
        const { data, error } = await supabaseAdmin
          .from("product_variants")
          .insert({ ...variantData, product_id: id })
          .select("id")
          .single();

        if (error || !data) throw error;
        variantId = data.id;
      }

      // Upsert inventory
      const { error: invError } = await supabaseAdmin
        .from("product_inventory")
        .upsert(
          {
            product_id: id,
            variant_id: variantId,
            quantity_available: variantStock ?? 0,
            quantity_reserved: 0,
            track_inventory: true,
          },
          { onConflict: "product_id,variant_id" },
        );

      if (invError) throw invError;
    }
  }

  /* ---------------------------
     4️⃣ SIMPLE PRODUCT INVENTORY
  ---------------------------- */
  if ((!variants || variants.length === 0) && stock !== undefined) {
    // Try update first
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("product_inventory")
      .update({
        quantity_available: stock,
        track_inventory: true,
      })
      .eq("product_id", id)
      .is("variant_id", null)
      .select("id");

    if (updateError) throw updateError;

    // If no row updated → insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabaseAdmin
        .from("product_inventory")
        .insert({
          product_id: id,
          variant_id: null,
          quantity_available: stock,
          quantity_reserved: 0,
          track_inventory: true,
        });

      if (insertError) throw insertError;
    }
  }

  /* ---------------------------
     5️⃣ Images (unchanged logic)
  ---------------------------- */
  if (images && images.length > 0) {
    const { data: existingImages } = await supabaseAdmin
      .from("product_images")
      .select("id, image_url")
      .eq("product_id", id);

    const uploadedImages: ProductImageType[] = [];
    const keepUrls = images.map((i) => i.imageUrl);

    const toDelete = existingImages?.filter(
      (img) => !keepUrls.includes(img.image_url),
    );

    if (toDelete?.length) {
      await supabaseAdmin
        .from("product_images")
        .delete()
        .in(
          "id",
          toDelete.map((i) => i.id),
        );
    }

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const exists = existingImages?.find(
        (ex) => ex.image_url === img.imageUrl,
      );

      if (exists) {
        await supabaseAdmin
          .from("product_images")
          .update({
            alt_text: img.altText,
            sort_order: i,
            is_primary: i === 0,
          })
          .eq("id", exists.id);
        continue;
      }

      uploadedImages.push({
        product_id: id,
        image_url: img.imageUrl,
        alt_text: img.altText,
        sort_order: i,
        is_primary: i === 0,
      });
    }

    if (uploadedImages.length > 0) {
      await supabaseAdmin.from("product_images").insert(uploadedImages);
    }
  }

  return true;
}
