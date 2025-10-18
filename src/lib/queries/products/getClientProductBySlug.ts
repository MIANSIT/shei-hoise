// lib/queries/products/getClientProductBySlug.ts
import { supabaseAdmin } from "@/lib/supabase";

export async function getClientProductBySlug(store_slug: string, product_slug: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      base_price,
      discounted_price,
      categories(id, name),
      product_images(id, image_url, is_primary),
      product_variants(
        id,
        variant_name,
        base_price,
        discounted_price,
        color,
        product_inventory(quantity_available, quantity_reserved),
        product_images(id, image_url, is_primary)
      )
    `)
    .eq("slug", product_slug)
    .single();

  if (error) {
    console.error("Error fetching product by slug:", error);
    throw new Error(error.message);
  }
  
  return data;
}