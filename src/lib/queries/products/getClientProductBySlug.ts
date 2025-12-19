// lib/queries/products/getClientProductBySlug.ts
import { supabaseAdmin } from "@/lib/supabase";

interface ProductVariant {
  id: string;
  sku: string;
  variant_name: string;
  base_price: number;
  discounted_price: number | null;
  discount_amount: number | null;
  color: string | null;
  is_active: boolean;
  product_inventory: {
    quantity_available: number;
    quantity_reserved: number;
  }[];
  product_images: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  discounted_price: number | null;
  discount_amount: number | null;
  categories: { id: string; name: string }[];
  product_images: { id: string; image_url: string; is_primary: boolean }[];
  product_inventory: {
    quantity_available: number;
    quantity_reserved: number;
  }[];
  product_variants: ProductVariant[];
}

export async function getClientProductBySlug(
  product_slug: string
): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      sku,
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
        sku,
        variant_name,
        base_price,
        discounted_price,
        discount_amount,
        color,
        is_active,
        product_inventory(quantity_available, quantity_reserved),
        product_images(id, image_url, is_primary)
      )
    `
    )
    .eq("slug", product_slug)
    .single();

  if (error) {
    console.error("Error fetching product by slug:", error);
    throw new Error(error.message);
  }

  if (!data) return null;

  // Filter out inactive variants with proper typing
  data.product_variants = (data.product_variants || []).filter(
    (variant: ProductVariant) => variant.is_active !== false
  );

  return data as Product;
}
