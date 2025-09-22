import { CreateProductType } from "@/lib/schema/productSchema";
import { supabase } from "@/lib/supabase";

// Insert product and related records
export async function createProduct(product: CreateProductType) {
  try {
    // Step 1: Insert main product
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
        sku: product.sku,
        weight: product.weight,
        dimensions: product.dimensions,
        is_digital: product.is_digital,
        status: product.status,
        featured: product.featured,
        meta_title: product.meta_title,
        meta_description: product.meta_description,
      })
      .select("id")
      .single();

    if (productError) throw productError;
    const productId = productData.id;

    // Step 2: Insert variants (if any)
    if (product.variants && product.variants.length > 0) {
      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(
          product.variants.map((variant) => ({
            product_id: productId,
            variant_name: variant.variant_name,
            sku: variant.sku,
            price: variant.price,
            attributes: variant.attributes,
            weight: variant.weight,
          }))
        );

      if (variantError) throw variantError;
    }

    // Step 3: Insert images (if any)
    if (product.images && product.images.length > 0) {
      const { error: imageError } = await supabase
        .from("product_images")
        .insert(
          product.images.map((image) => ({
            product_id: productId,
            image_url: image.imageUrl, // camelCase → snake_case
            alt_text: image.altText, // camelCase → snake_case
            is_primary: image.isPrimary ?? false,
          }))
        );

      if (imageError) throw imageError;
    }

    return { success: true, productId };
  } catch (err) {
    console.error("Error inserting product:", err);
    return { success: false, error: err };
  }
}
