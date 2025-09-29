// src/lib/queries/products/createProduct.ts
import { supabase } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
import { createInventory } from "@/lib/queries/inventory/createInventory";
import { uploadProductImages } from "@/lib/queries/storage/uploadProductImages";

export async function createProduct(product: ProductType) {
  try {
    // 1️⃣ Insert Product
    const { data: productData, error: productError } = await supabase
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
    const productId = productData.id;

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

      const { data: insertedVariants, error: variantError } = await supabase
        .from("product_variants")
        .insert(variantsToInsert)
        .select("id");

      if (variantError) throw variantError;

      // Create inventory for variants
      (insertedVariants as { id: string }[]).forEach((v, idx) => {
        createInventory({
          product_id: productId,
          variant_id: v.id,
          quantity_available: product.variants![idx].stock ?? 0,
        });
      });
    } else {
      // No variants → inventory for main product
      await createInventory({
        product_id: productId,
        quantity_available: product.stock ?? 0,
      });
    }

    // 3️⃣ Upload images via helper
    if (product.images?.length) {
      await uploadProductImages(product.store_id!, productId, product.images);
    }

    return productId;
  } catch (err) {
    console.error("createProduct error:", err);
    throw err;
  }
}
