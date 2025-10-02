// src/lib/queries/products/createProduct.ts
import { supabaseAdmin } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
import { createInventory } from "@/lib/queries/inventory/createInventory";
import { uploadProductImages } from "@/lib/queries/storage/uploadProductImages";

/**
 * Fully atomic product creation with robust rollback
 */
export async function createProduct(product: ProductType) {
  if (!product.store_id) throw new Error("Store ID is missing");

  let productId: string | null = null;
  const insertedVariantIds: string[] = [];

  // Helper function for rollback
  const rollback = async () => {
    if (!productId) return;

    const tablesToDelete = [
      { table: "product_images", column: "product_id", values: [productId] },
      { table: "product_inventory", column: "product_id", values: [productId] },
      insertedVariantIds.length
        ? {
            table: "product_variants",
            column: "id",
            values: insertedVariantIds,
          }
        : null,
      { table: "products", column: "id", values: [productId] },
    ].filter(Boolean) as { table: string; column: string; values: string[] }[];

    for (const { table, column, values } of tablesToDelete) {
      if (!values.length) continue;
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .in(column, values);
      if (error) console.error(`Rollback failed for ${table}:`, error);
    }
  };

  try {
    // 1️⃣ Insert main product
    const { data: productData, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        store_id: product.store_id,
        category_id: product.category_id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.short_description,
        base_price: product.base_price,
        tp_price: product.tp_price,
        discounted_price: product.discounted_price,
        discount_amount: product.discount_amount,
        weight: product.weight,
        sku: product.sku,
        status: product.status ?? "draft",
        featured: product.featured,
      })
      .select("id")
      .single();

    if (productError) throw productError;
    if (!productData?.id) throw new Error("Product ID not returned");
    productId = productData.id;

    // 2️⃣ Insert Variants (if any)
    let firstVariantId: string | undefined = undefined;

    if (product.variants?.length) {
      const variantsToInsert = product.variants.map(
        (v: ProductVariantType) => ({
          variant_name: v.variant_name,
          sku: v.sku,
          price: v.price,
          weight: v.weight,
          color: v.color,
          attributes: v.attributes ?? {},
          is_active: v.is_active,
          product_id: productId,
        })
      );

      const { data: insertedVariants, error: variantError } =
        await supabaseAdmin
          .from("product_variants")
          .insert(variantsToInsert)
          .select("id");

      if (variantError) throw variantError;

      insertedVariants.forEach((v) => insertedVariantIds.push(v.id));
      firstVariantId = insertedVariants[0]?.id;

      // Create inventory for each variant
      for (let i = 0; i < insertedVariants.length; i++) {
        try {
          await createInventory({
            product_id: productId!,
            variant_id: insertedVariants[i].id,
            quantity_available: product.variants![i].stock ?? 0,
          });
        } catch (invErr) {
          console.error("Inventory creation failed:", invErr);
          throw invErr;
        }
      }
    } else {
      // No variants → create main inventory
      await createInventory({
        product_id: productId!,
        quantity_available: product.stock ?? 0,
      });
    }

    // 3️⃣ Upload images
    if (product.images?.length) {
      const imagesWithVariantId = product.images.map((img) => ({
        ...img,
        variantId: firstVariantId, // undefined if no variants
      }));

      try {
        await uploadProductImages(
          product.store_id,
          productId!,
          imagesWithVariantId
        );
      } catch (imgErr) {
        console.error("Image upload failed:", imgErr);
        throw imgErr;
      }
    }

    return productId;
  } catch (err: unknown) {
    console.error("createProduct failed:", err);

    // Perform rollback
    try {
      await rollback();
    } catch (rollbackErr) {
      console.error("Rollback encountered errors:", rollbackErr);
    }

    throw err; // rethrow original error
  }
}
