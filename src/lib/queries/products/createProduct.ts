"use client";
import { supabase } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
import { createProductInventory } from "./inventory/createProductInventory";

export async function createProduct(product: ProductType) {
  try {
    // 1️⃣ Insert product
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
      })
      .select("id")
      .single();

    if (productError || !productData) throw productError;

    const productId = productData.id;

    // 2️⃣ Insert variants if any and get their IDs
    let variantIds: string[] = [];
    let variantStocks: number[] = [];

    if (product.variants && product.variants.length > 0) {
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

      variantIds = insertedVariants.map((v: { id: string }) => v.id);
      variantStocks = product.variants.map((v) => v.stock ?? 0);
    }

    // 3️⃣ Create inventory records
    const mainProductStock = product.stock ?? 0;

    await createProductInventory(
      productId,
      variantIds,
      mainProductStock,
      variantStocks,
      true
    );

    return productId;
  } catch (err) {
    console.error("createProduct error:", err);
    throw err;
  }
}
