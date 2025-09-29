// src/lib/queries/products/createProduct.ts
import { supabaseAdmin } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
import { createInventory } from "@/lib/queries/inventory/createInventory";
import { uploadProductImages } from "@/lib/queries/storage/uploadProductImages";

/**
 * Fully atomic product creation (shorter, cleaner rollback)
 */
export async function createProduct(product: ProductType) {
  let productId: string | null = null;
  const insertedVariantIds: string[] = [];

  try {
    // 1️⃣ Insert Product
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
    productId = productData.id;
    if (!productId) throw new Error("Product ID is missing");

    // 2️⃣ Insert Variants if any
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

      insertedVariants.forEach((v: { id: string }) =>
        insertedVariantIds.push(v.id)
      );

      for (let i = 0; i < insertedVariants.length; i++) {
        await createInventory({
          product_id: productId,
          variant_id: insertedVariants[i].id,
          quantity_available: product.variants![i].stock ?? 0,
        });
      }
    } else {
      await createInventory({
        product_id: productId,
        quantity_available: product.stock ?? 0,
      });
    }

    // 3️⃣ Upload images (rollback-safe function)
    if (product.images?.length) {
      await uploadProductImages(product.store_id!, productId, product.images);
    }

    return productId;
  } catch (err) {
    console.error("createProduct failed, rolling back:", err);

    if (productId) {
      // 🔴 Clean rollback using loop
      const tablesToDelete = [
        { table: "product_images", column: "product_id", values: [productId] },
        {
          table: "product_inventory",
          column: "product_id",
          values: [productId],
        },
      ];

      // Add variants if any
      if (insertedVariantIds.length) {
        tablesToDelete.push({
          table: "product_variants",
          column: "id",
          values: insertedVariantIds,
        });
      }

      // Add the main product last
      tablesToDelete.push({
        table: "products",
        column: "id",
        values: [productId],
      });

      // Loop through tables and delete
      for (const { table, column, values } of tablesToDelete) {
        try {
          await supabaseAdmin.from(table).delete().in(column, values);
        } catch (deleteErr) {
          console.error(
            `Failed to delete from ${table} during rollback:`,
            deleteErr
          );
        }
      }
    }

    throw err;
  }
}
