/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";

export interface ProductVariant {
  id: string;
  variant_name: string | null;
  sku: string | null;
  base_price: number | null;
  discounted_price: number | null;
  discount_amount: number | null;
  tp_price: number | null;
  weight: number | null;
  color: string | null;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  base_price: number | null;
  discounted_price: number | null;
  category_id: string | null;
  category?: Category | null;
  product_variants: ProductVariant[];
}

export async function getProductsWithVariants(storeId: string) {
  const { data, error } = await supabase
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
      product_variants(
        id,
        variant_name,
        sku,
        base_price,
        discounted_price,
        discount_amount,
        tp_price,
        weight,
        color,
        is_active
      )
      `
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Normalize the data
  return (data ?? []).map((p: any) => ({
    ...p,
    category: p.categories
      ? { id: p.categories.id, name: p.categories.name }
      : null,
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
    })),
  })) as ProductWithVariants[];
}
