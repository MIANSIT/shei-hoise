"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { ProductUpdateType } from "@/lib/schema/productUpdateSchema";
import { uploadOrUpdateProductImages } from "@/lib/queries/storage/uploadProductImages";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export async function updateProduct(data: ProductUpdateType) {
  const { id, store_id: _clientStoreId, variants, images, stock, ...productData } = data;

  // id and data.store_id are caller-supplied — never trust either for
  // authorization. Resolve the caller's real store and confirm the product
  // being edited actually belongs to it.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const store_id = storeResult.storeId;

  const { data: existingProduct, error: ownerLookupError } = await supabaseAdmin
    .from("products")
    .select("store_id")
    .eq("id", id)
    .single();

  if (ownerLookupError || !existingProduct) throw new Error("Product not found");
  if (existingProduct.store_id !== store_id) {
    throw new Error("You do not have permission to update this product");
  }

  // Whole-set check — this replaces the product's entire variant list at
  // once (delete-then-upsert below), not one variant at a time.
  if (variants && variants.length > 0) {
    const subscription = await getStoreFeatureSubscription(store_id);
    const variantLimitCheck = checkLimit(subscription, "max_variants_per_product", variants.length - 1);
    if (!variantLimitCheck.allowed) {
      throw new Error(
        `You can add up to ${variantLimitCheck.limit} variants per product on your plan. Remove some variants and try again.`,
      );
    }
  }

  // 1️⃣ Update main product (without stock)
  // Discount fields are normalised to null when absent: supabase-js drops
  // undefined keys from the JSON body, so leaving them out would keep the old
  // sale price on a product whose discount was just removed.
  const { error: productError } = await supabaseAdmin
    .from("products")
    .update({
      ...productData,
      discounted_price: productData.discounted_price ?? null,
      discount_amount: productData.discount_amount ?? null,
    })
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
      const { stock: variantStock, ...rest } = variant;
      // Same normalisation as the product above — a cleared variant discount
      // must be written as null, not omitted.
      const variantData = {
        ...rest,
        discounted_price: rest.discounted_price ?? null,
        discount_amount: rest.discount_amount ?? null,
      };
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
