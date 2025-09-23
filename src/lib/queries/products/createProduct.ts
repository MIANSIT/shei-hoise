"use client";
import { supabase } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
import { createProductInventory } from "./inventory/createProductInventory";
import { uploadProductImage } from "@/lib/queries/products/productImage/uploadProductImage";

export async function createProduct(product: ProductType): Promise<string> {
  try {
    // 1️⃣ Insert placeholder images first
    let imageRows: { id: string }[] = [];
    const images = product.images ?? [];
    if (images.length > 0) {
      const { data, error } = await supabase
        .from("product_images")
        .insert(
          images.map((img, idx) => ({
            product_id: null,
            variant_id: null,
            image_url: "",
            alt_text: img.altText ?? "",
            sort_order: idx,
            is_primary: img.isPrimary ?? false,
          }))
        )
        .select("id");
      if (error) throw error;
      imageRows = data;
    }

    // 2️⃣ Insert product
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

    // 3️⃣ Update product_id in product_images
    if (imageRows.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const file = images[i].file;
        if (!file) continue; // skip if file is undefined
        const publicURL = await uploadProductImage(file, productId);
        await supabase
          .from("product_images")
          .update({ image_url: publicURL, product_id: productId })
          .eq("id", imageRows[i].id);
      }
    }

    // 4️⃣ Insert variants if any
    let variantIds: string[] = [];
    let variantStocks: number[] = [];
    const variants = product.variants ?? [];
    if (variants.length > 0) {
      const variantsToInsert = variants.map((v: ProductVariantType) => ({
        variant_name: v.variant_name,
        sku: v.sku,
        price: v.price,
        weight: v.weight,
        color: v.color,
        attributes: v.attributes ?? {},
        is_active: v.is_active,
        product_id: productId,
      }));
      const { data: insertedVariants, error: variantError } = await supabase
        .from("product_variants")
        .insert(variantsToInsert)
        .select("id");
      if (variantError) throw variantError;

      variantIds = insertedVariants.map((v: { id: string }) => v.id);
      variantStocks = variants.map((v) => v.stock ?? 0);
    }

    // 5️⃣ Create inventory
    await createProductInventory(
      productId,
      variantIds,
      product.stock ?? 0,
      variantStocks,
      true
    );

    return productId;
  } catch (err) {
    console.error("createProduct error:", err);
    throw err;
  }
}
