// lib/queries/products/getProductsWithOptionalStore.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import type { ProductWithVariants } from "./getProductsWithVariants";

export async function getProductsWithOptionalStore(storeId?: string): Promise<ProductWithVariants[]> {
  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      base_price,
      discounted_price,
      category_id,
      categories (id, name),
      product_images (
        id,
        product_id,
        variant_id,
        image_url,
        alt_text,
        is_primary
      ),
      product_variants (
        id,
        variant_name,
        sku,
        base_price,
        discounted_price,
        discount_amount,
        tp_price,
        weight,
        color,
        is_active,
        product_images (
          id,
          product_id,
          variant_id,
          image_url,
          alt_text,
          is_primary
        ),
        product_inventory (quantity_available, quantity_reserved)
      ),
      product_inventory (quantity_available, quantity_reserved)
      `
    )
    .order("created_at", { ascending: false });

  // If storeId is provided, filter by it
  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_price: p.base_price,
    discounted_price: p.discounted_price,
    category_id: p.category_id,
    category: p.categories ? { id: p.categories.id, name: p.categories.name } : null,
    product_images: p.product_images ?? [],
    product_variants: (p.product_variants ?? []).map((v: any) => ({
      id: v.id,
      variant_name: v.variant_name,
      sku: v.sku,
      base_price: v.base_price,
      discounted_price: v.discounted_price,
      discount_amount: v.discount_amount,
      tp_price: v.tp_price,
      weight: v.weight,
      color: v.color,
      is_active: v.is_active,
      product_images: v.product_images ?? [],
      product_inventory: v.product_inventory ?? [],
    })),
    product_inventory: p.product_inventory ?? [],
  })) as ProductWithVariants[];
}
