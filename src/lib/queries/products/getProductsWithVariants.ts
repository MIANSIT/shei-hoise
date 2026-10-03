// lib/queries/products/getProductsWithVariants.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabase";
import { ProductStatus } from "@/lib/types/enums";
import { getBundleAvailabilityMap } from "@/lib/queries/bundles/getBundleAvailabilityMap";
import { searchProductIds } from "@/lib/queries/products/searchProductIds";

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
  sale_starts_at: string | null;
  sale_ends_at: string | null;
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
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  featured: boolean;
  /** Waives the delivery fee for any order containing this product. */
  free_delivery: boolean;
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

/**
 * List order when not searching. "store" is the manual drag order customers
 * see on the storefront; "newest" is what an owner usually wants while
 * managing products (a just-added one lands on top).
 */
export type ProductListSort = "store" | "newest" | "name";

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
  sort = "store",
  branchId,
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
  /** Order when not searching (a search is always ordered by relevance). Defaults to "store". */
  sort?: ProductListSort;
  /**
   * Stores with branches: report this branch's stock instead of the store
   * total (Quick Sale and Create Order sell from the selected branch).
   */
  branchId?: string | null;
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
      free_delivery,
      discounted_price,
      sale_starts_at,
      sale_ends_at,
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
        sale_starts_at,
        sale_ends_at,
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

  // A typed search resolves matching ids itself (substring or typo-tolerant
  // against name/sku/description — see searchProductIds.ts) rather than a
  // plain ilike on name alone, so a slightly misspelled or SKU-based search
  // still finds the right product. Relevance order only exists in memory, so
  // pagination for a search is applied by hand below instead of via range().
  let relevanceOrder: string[] | null = null;

  if (productIds && productIds.length > 0) {
    query.in("id", productIds);
  } else if (search?.trim()) {
    relevanceOrder = await searchProductIds(storeId, search.trim(), {
      statusEq: status,
      excludeBundles,
      featured,
    });
    if (relevanceOrder.length === 0) {
      return {
        data: [],
        total: 0,
        counts: { [ProductStatus.ACTIVE]: 0, [ProductStatus.INACTIVE]: 0, [ProductStatus.DRAFT]: 0, ALL: 0 },
        featuredCount: 0,
      };
    }
    // searchProductIds already applied status/featured/bundle filters, so
    // only the ids on the requested page need their full product rows —
    // loading every match (with variants, images and stock) and slicing in
    // the browser made broad searches slow, and past 1000 matches PostgREST
    // silently dropped rows.
    const pageIds =
      page !== undefined && pageSize !== undefined
        ? relevanceOrder.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
        : relevanceOrder;
    if (pageIds.length === 0) {
      return {
        data: [],
        total: relevanceOrder.length,
        counts: { [ProductStatus.ACTIVE]: 0, [ProductStatus.INACTIVE]: 0, [ProductStatus.DRAFT]: 0, ALL: 0 },
        featuredCount: 0,
      };
    }
    query.in("id", pageIds);
  } else {
    // Manual drag order first (see reorderProducts.ts), then A–Z. A product
    // added after the catalog was numbered has no position yet, so it lands
    // at the end with its alphabetical neighbours until it's dragged.
    if (sort === "newest") {
      query.order("created_at", { ascending: false });
    } else if (sort === "name") {
      query.order("name", { ascending: true });
    } else {
      query.order("sort_order", { ascending: true, nullsFirst: false });
      query.order("name", { ascending: true });
    }

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
    free_delivery: p.free_delivery ?? false,
    discounted_price: p.discounted_price,
    sale_starts_at: p.sale_starts_at ?? null,
    sale_ends_at: p.sale_ends_at ?? null,
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
      sale_starts_at: v.sale_starts_at ?? null,
      sale_ends_at: v.sale_ends_at ?? null,
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

  if (branchId) await overlayBranchStock(products, branchId);

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

  // Relevance order only exists in memory — the .in() filter above doesn't
  // preserve the order its ids were passed in — so search results are
  // re-sorted to match relevanceOrder and paginated by hand here instead of
  // via range() (which was skipped for exactly this reason).
  let finalProducts = products;
  let total = count ?? 0;

  if (relevanceOrder) {
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = relevanceOrder
      .map((id) => byId.get(id))
      .filter((p): p is ProductWithVariants => !!p);

    // Only this page's rows were fetched; the total is every match.
    total = relevanceOrder.length;
    finalProducts = ordered;
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
    data: finalProducts,
    total,
    counts,
    featuredCount,
  };
}

/**
 * Replaces each product/variant's stock with one branch's numbers (a product
 * the branch has never held shows 0). Store-wide totals are untouched for
 * everyone else.
 */
async function overlayBranchStock(products: ProductWithVariants[], branchId: string): Promise<void> {
  const ids = products.map((p) => p.id);
  if (ids.length === 0) return;
  const rows: { product_id: string; variant_id: string | null; quantity_available: number; quantity_reserved: number }[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("branch_inventory")
      .select("product_id, variant_id, quantity_available, quantity_reserved")
      .eq("branch_id", branchId)
      .in("product_id", ids.slice(i, i + 200));
    rows.push(...((data as typeof rows) ?? []));
  }
  const key = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;
  const byKey = new Map(rows.map((r) => [key(r.product_id, r.variant_id), r]));
  const stockFor = (productId: string, variantId: string | null): ProductStock[] => {
    const row = byKey.get(key(productId, variantId));
    return [{ quantity_available: row?.quantity_available ?? 0, quantity_reserved: row?.quantity_reserved ?? 0 }];
  };
  for (const product of products) {
    if (product.product_type === "bundle") continue;
    product.product_inventory = stockFor(product.id, null);
    for (const variant of product.product_variants) {
      variant.product_inventory = stockFor(product.id, variant.id);
    }
  }
}
