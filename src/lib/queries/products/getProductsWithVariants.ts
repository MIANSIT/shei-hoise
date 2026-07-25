// lib/queries/products/getProductsWithVariants.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabase";
import { ProductStatus } from "@/lib/types/enums";
import { getBundleAvailabilityMap } from "@/lib/queries/bundles/getBundleAvailabilityMap";

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
  tp_price: number | null;
  discounted_price: number | null;
  featured: boolean;
  category_id: string | null;
  category?: Category | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  product_inventory: ProductStock[];
  status: string;
  product_type: "simple" | "bundle";
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
  featured,
  excludeBundles,
  withCounts = true,
  productIds,
}: {
  storeId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: ProductStatus;
  featured?: boolean;
  /** True for the plain product list/picker — bundles get their own list page. */
  excludeBundles?: boolean;
  /** Set false to skip the extra per-status/featured count query (e.g. order product pickers that only need `data`). */
  withCounts?: boolean;
  /** Fetch exactly these product IDs instead of paging through the store's catalog — e.g. resolving an existing order's line items without loading everything else. Ignores search/page/pageSize/status/featured/excludeBundles. */
  productIds?: string[];
}): Promise<{
  data: ProductWithVariants[];
  total: number;
  counts: Record<ProductStatus | "ALL", number>;
  featuredCount: number;
}> {
  if (productIds && productIds.length === 0) {
    return {
      data: [],
      total: 0,
      counts: {
        [ProductStatus.ACTIVE]: 0,
        [ProductStatus.INACTIVE]: 0,
        [ProductStatus.DRAFT]: 0,
        ALL: 0,
      },
      featuredCount: 0,
    };
  }

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
      tp_price,
      status,
      featured,
      discounted_price,
      category_id,
      product_type,
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
    .eq("store_id", storeId);

  if (productIds && productIds.length > 0) {
    query.in("id", productIds);
  } else {
    query.order("created_at", { ascending: false });

    if (search?.trim()) query.ilike("name", `%${search.trim()}%`);
    if (status) query.eq("status", status);
    if (featured !== undefined) query.eq("featured", featured);
    if (excludeBundles) query.neq("product_type", "bundle");

    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query.range(from, to);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const products = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    base_price: p.base_price,
    tp_price: p.tp_price,
    status: p.status ?? ProductStatus.INACTIVE,
    featured: p.featured ?? false,
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
    product_type: p.product_type ?? "simple",
  })) as ProductWithVariants[];

  // Bundles have no product_inventory row of their own — patch in the
  // computed "how many can I sell right now" so every downstream consumer
  // (stock badges, cart quantity clamping) reads it exactly like a normal
  // product's inventory row, with zero further changes.
  const bundleIds = products
    .filter((p) => p.product_type === "bundle")
    .map((p) => p.id);
  if (bundleIds.length > 0) {
    const availabilityMap = await getBundleAvailabilityMap(bundleIds);
    for (const product of products) {
      if (product.product_type === "bundle") {
        product.product_inventory = [
          {
            quantity_available: availabilityMap.get(product.id) ?? 0,
            quantity_reserved: 0,
          },
        ];
      }
    }
  }

  // ------------------ 2️⃣ Fetch counts per status + featured ------------------
  const counts: Record<ProductStatus | "ALL", number> = {
    [ProductStatus.ACTIVE]: 0,
    [ProductStatus.INACTIVE]: 0,
    [ProductStatus.DRAFT]: 0,
    ALL: 0,
  };

  let featuredCount = 0;

  if (withCounts) {
    const { data: countData, error: countError } = await supabase
      .from("products")
      .select("status, featured")
      .eq("store_id", storeId);

    if (countError) throw countError;

    countData?.forEach((p: any) => {
      const s = p.status as ProductStatus;
      if (s in counts) counts[s] += 1;
      counts.ALL += 1;
      if (p.featured) featuredCount += 1;
    });
  }

  return {
    data: products,
    total: count ?? 0,
    counts,
    featuredCount,
  };
}
