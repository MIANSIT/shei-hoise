// lib/queries/products/createProduct.ts
import { supabase } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";

/**
 * Create a product and optionally its variants.
 * Returns the newly created product id.
 */
export async function createProduct(product: ProductType) {
  try {
    // Insert the product
    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        store_id: product.store_id,
        category_id: product.category_id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.shortDescription,
        base_price: product.basePrice,
        tp_price: product.tpPrice,
        discounted_price: product.discountedPrice,
        discount_amount: product.discountAmount,
        weight: product.weight,
        sku: product.sku,
        // images: product.images, // assuming jsonb column
      })
      .select("id")
      .single();

    if (productError) throw productError;

    const productId = productData.id;

    // Insert variants if any
    if (product.variants && product.variants.length > 0) {
      const variantsToInsert: ProductVariantType[] = product.variants.map((v) => ({
        ...v,
        productId,
      }));

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variantsToInsert);

      if (variantError) throw variantError;
    }

    return productId;
  } catch (err) {
    console.error("createProduct error:", err);
    throw err;
  }
}
