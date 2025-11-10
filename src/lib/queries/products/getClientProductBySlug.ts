// lib/queries/products/getClientProductBySlug.ts
import { supabaseAdmin } from "@/lib/supabase";

export async function getClientProductBySlug(product_slug: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      base_price,
      discounted_price,
      discount_amount,
      categories(id, name),
      product_images(id, image_url, is_primary),
      product_inventory(quantity_available, quantity_reserved),
      product_variants(
        id,
        variant_name,
        base_price,
        discounted_price,
        discount_amount,
        color,
        product_inventory(quantity_available, quantity_reserved),
        product_images(id, image_url, is_primary)
      )
    `
    )
    .eq("slug", product_slug)
    .single();

  if (error) {
    // Handle "not found" case gracefully
    if (error.code === "PGRST116") {
      console.log("Product not found for slug:", product_slug);
      return null;
    }

    console.error("Error fetching product by slug:", error);
    throw new Error(error.message);
  }

  return data;
}