// lib/queries/products/createProduct.ts
import { supabase } from "@/lib/supabase";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
export async function createProduct(product: ProductType) {
  try {
    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        store_id: product.store_id,
        category_id: product.category_id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.short_description, // keep the DB column name
        base_price: product.base_price,
        tp_price: product.tp_price,
        discounted_price: product.discounted_price,
        discount_amount: product.discount_amount,
        weight: product.weight,
        sku: product.sku,
        // images: product.images, // uncomment only if you actually have an `images` jsonb column
      })
      .select("id")
      .single();

    if (productError) throw productError;

    const productId = productData.id;

    // --- 2️⃣ Insert variants if any ---
    if (product.variants && product.variants.length > 0) {
      // Map JS keys to the actual DB column names
      const variantsToInsert = product.variants.map((v: ProductVariantType) => ({
        variant_name: v.variant_name,
        sku: v.sku,
        price: v.price,
        weight: v.weight,
        color: v.color,
        attributes: v.attributes ?? {}, // must be jsonb
        is_active: v.is_active,         // rename from isActive
        product_id: productId,          // rename from productId
      }));

      const { error: variantError } = await supabase
        .from("product_variants")      // ✅ correct table name
        .insert(variantsToInsert);

      if (variantError) throw variantError;
    }

    return productId;
  } catch (err) {
    console.error("createProduct error:", err);
    throw err;
  }
}
