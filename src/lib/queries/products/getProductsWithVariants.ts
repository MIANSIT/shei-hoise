/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
}

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
  product_images: ProductImage[]; // ✅ include images here
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
  product_images: ProductImage[]; // ✅ main product images
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
        )
      )
      `
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_price: p.base_price,
    discounted_price: p.discounted_price,
    category_id: p.category_id,
    category: p.categories
      ? { id: p.categories.id, name: p.categories.name }
      : null,
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
    })),
  })) as ProductWithVariants[];
}
