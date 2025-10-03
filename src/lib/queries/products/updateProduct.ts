// src/lib/queries/products/updateProduct.ts
import { supabaseAdmin } from "@/lib/supabase";
import { UpdateProductType } from "@/lib/schema/updateProductSchema";
import { uploadProductImages } from "@/lib/queries/storage/uploadProductImages";

/**
 * Fetch full snapshot of product (main row, variants, inventory, images)
 */
async function fetchFullProduct(productId: string) {
  const { data: product, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (prodErr) throw prodErr;

  const { data: variants, error: varErr } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .eq("product_id", productId);
  if (varErr) throw varErr;

  const { data: inventory, error: invErr } = await supabaseAdmin
    .from("product_inventory")
    .select("*")
    .eq("product_id", productId);
  if (invErr) throw invErr;

  const { data: images, error: imgErr } = await supabaseAdmin
    .from("product_images")
    .select("*")
    .eq("product_id", productId);
  if (imgErr) throw imgErr;

  return { product, variants, inventory, images };
}

/**
 * Restore snapshot if update fails
 */
async function restoreProductSnapshot(
  productId: string,
  snapshot: Awaited<ReturnType<typeof fetchFullProduct>>
) {
  // Clear current state
  const tables = ["product_images", "product_inventory", "product_variants"];
  for (const table of tables) {
    await supabaseAdmin.from(table).delete().eq("product_id", productId);
  }

  // Restore product row
  await supabaseAdmin
    .from("products")
    .update(snapshot.product)
    .eq("id", productId);

  // Restore variants
  if (snapshot.variants.length) {
    await supabaseAdmin.from("product_variants").insert(snapshot.variants);
  }

  // Restore inventory
  if (snapshot.inventory.length) {
    await supabaseAdmin.from("product_inventory").insert(snapshot.inventory);
  }

  // Restore images
  if (snapshot.images.length) {
    await supabaseAdmin.from("product_images").insert(snapshot.images);
  }
}

/**
 * Update product with rollback-on-failure
 */
export async function updateProduct(update: UpdateProductType) {
  if (!update.id) throw new Error("Product ID is required");

  // Take snapshot before updating
  const snapshot = await fetchFullProduct(update.id);

  try {
    // 1️⃣ Update product main row (ignore variants/images/stock for now)
    const productFields = { ...update };
    delete productFields.variants;
    delete productFields.images;
    delete productFields.stock; // ❌ important: products table has no stock column

    if (Object.keys(productFields).length > 0) {
      const { error: productError } = await supabaseAdmin
        .from("products")
        .update(productFields)
        .eq("id", update.id);
      if (productError) throw productError;
    }

    // 2️⃣ Update variants
    if (update.variants) {
      // Delete old → insert new
      const { error: delVarError } = await supabaseAdmin
        .from("product_variants")
        .delete()
        .eq("product_id", update.id);
      if (delVarError) throw delVarError;

      if (update.variants.length) {
        const { error: insVarError } = await supabaseAdmin
          .from("product_variants")
          .insert(
            update.variants.map(({ stock, ...v }) => ({
              ...v,
              product_id: update.id,
            }))
          );
        if (insVarError) throw insVarError;
      }
    }

    // 3️⃣ Update inventory (main product stock only)
    if (update.stock !== undefined) {
      const { error: invError } = await supabaseAdmin
        .from("product_inventory")
        .update({ quantity_available: update.stock })
        .eq("product_id", update.id)
        .is("variant_id", null); // only main product
      if (invError) throw invError;
    }

    // 4️⃣ Update images
    if (update.images) {
      // Delete old → insert new
      const { error: delImgError } = await supabaseAdmin
        .from("product_images")
        .delete()
        .eq("product_id", update.id);
      if (delImgError) throw delImgError;

      await uploadProductImages(
        update.store_id ?? snapshot.product.store_id,
        update.id,
        update.images
      );
    }

    return { success: true };
  } catch (err) {
    console.error("updateProduct failed:", err);

    // Rollback to snapshot
    try {
      await restoreProductSnapshot(update.id, snapshot);
    } catch (restoreErr) {
      console.error("Failed to restore product snapshot:", restoreErr);
    }

    throw err;
  }
}
