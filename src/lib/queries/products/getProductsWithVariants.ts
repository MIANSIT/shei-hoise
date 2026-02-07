// lib/queries/products/getProductsWithVariants.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabase";
import { ProductStatus } from "@/lib/types/enums";

/* =========================
   Types
========================= */

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
}

export interface ProductStock {
  quantity_available: number;
  quantity_reserved: number;
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
  product_images: ProductImage[];
  product_inventory: ProductStock[];
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  base_price: number | null;
  discounted_price: number | null;
  category_id: string | null;
  category?: Category | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  product_inventory: ProductStock[];
  status: string;
}

/* =========================
   Query Options
========================= */

export async function getProductsWithVariants({
  storeId,
  search,
  page,
  pageSize,
  status,
}: {
  storeId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: ProductStatus;
}): Promise<{
  data: ProductWithVariants[];
  total: number;
  counts: Record<ProductStatus | "ALL", number>;
}> {
  // ------------------ 1️⃣ Fetch products ------------------
  const query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      sku,
      base_price,
      status,
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
        product_inventory (
          quantity_available,
          quantity_reserved
        )
      ),
      product_inventory (
        quantity_available,
        quantity_reserved
      )
      `,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (search?.trim()) query.ilike("name", `%${search.trim()}%`);
  if (status) query.eq("status", status);

  if (page !== undefined && pageSize !== undefined) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query.range(from, to);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const products = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    base_price: p.base_price,
    status: p.status ?? ProductStatus.INACTIVE,
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
      product_inventory: v.product_inventory ?? [],
    })),
    product_inventory: p.product_inventory ?? [],
  })) as ProductWithVariants[];

  // ------------------ 2️⃣ Fetch counts per status ------------------
  const { data: countData, error: countError } = await supabase
    .from("products")
    .select("status", { count: "exact" })
    .eq("store_id", storeId);

  if (countError) throw countError;

  const counts: Record<ProductStatus | "ALL", number> = {
    [ProductStatus.ACTIVE]: 0,
    [ProductStatus.INACTIVE]: 0,
    [ProductStatus.DRAFT]: 0,
    ALL: 0,
  };

  countData?.forEach((p: any) => {
    const s = p.status as ProductStatus;
    if (s in counts) counts[s] += 1;
    counts.ALL += 1;
  });

  return {
    data: products,
    total: count ?? 0,
    counts,
  };
}
