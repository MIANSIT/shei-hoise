// src/lib/queries/products/getProductsWithStoreSlug.ts
import { supabase } from "@/lib/supabase";

export async function getProductsWithStoreSlug(store_slug: string) {
  // 1️⃣ Get store by slug
  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id, store_slug")
    .eq("store_slug", store_slug)
    .single();

  if (storeError || !storeData) {
    throw storeError || new Error("Store not found");
  }

  // 2️⃣ Get products for this store
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      base_price,
      discounted_price,
      categories(id, name),
      product_variants(id)
    `)
    .eq("store_id", storeData.id);

  if (productError) {
    throw productError;
  }

  return productData ?? [];
}
