import { supabaseAdmin } from "@/lib/supabase";
import { ProductUpdateType } from "@/lib/schema/productUpdateSchema";
import { uploadOrUpdateProductImages } from "@/lib/queries/storage/uploadProductImages";

export async function updateProduct(data: ProductUpdateType) {
  const { id, store_id, variants, images, stock, ...productData } = data;

  if (!store_id) throw new Error("Store ID is required");

  // 1️⃣ Update main product (without stock)
  const { error: productError } = await supabaseAdmin
    .from("products")
    .update(productData)
    .eq("id", id);
  if (productError) throw productError;

  // 2️⃣ Handle Variants + Inventory
  const { data: existingVariants, error: fetchError } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_id", id);
  if (fetchError) throw fetchError;

  const existingIds = existingVariants?.map((v) => v.id) ?? [];
  const updatedIds = variants?.map((v) => v.id).filter(Boolean) ?? [];
  const toDelete = existingIds.filter((vid) => !updatedIds.includes(vid));

  if (toDelete.length > 0) {
    await supabaseAdmin.from("product_variants").delete().in("id", toDelete);
    await supabaseAdmin
      .from("product_inventory")
      .delete()
      .in("variant_id", toDelete);
  }

  if (variants && variants.length > 0) {
    for (const variant of variants) {
      const { stock: variantStock, ...variantData } = variant;
      let variantId = variant.id;

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
          { onConflict: "product_id,variant_id" }, // ✅ keep string
        );
      if (invError) throw invError;
    }
  }

  // 3️⃣ Simple product inventory (no variants)
  if ((!variants || variants.length === 0) && stock !== undefined) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("product_inventory")
      .update({ quantity_available: stock, track_inventory: true })
      .eq("product_id", id)
      .is("variant_id", null)
      .select("id");
    if (updateError) throw updateError;

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

  // 4️⃣ Handle Images
  // 4️⃣ Handle Images
  if (images && images.length > 0) {
    // Force first image = primary
    const imagesToSave = images.map((img, index) => ({
      ...img,
      isPrimary: index === 0,
    }));

    await uploadOrUpdateProductImages(store_id, id, imagesToSave);
  }

  return true;
}
