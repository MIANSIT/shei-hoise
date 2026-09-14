/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/products/clientGetProducts.ts
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types/product";
import { ProductStatus } from "@/lib/types/enums";
import { getBundleAvailabilityMap } from "@/lib/queries/bundles/getBundleAvailabilityMap";
import { getBundleComponentValueMap } from "@/lib/queries/bundles/getBundleComponentValueMap";
import { getBundleConfigurableMap } from "@/lib/queries/bundles/getBundleConfigurableMap";

/**
 * Storefront sort options.
 *
 * "default" is the shop's own order: whatever the owner dragged the catalog
 * into, A–Z by name for anything they haven't positioned. The rest are
 * explicit shopper choices.
 */
export type ProductSortOption =
  | "default"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc";

/**
 * Maps a sort option to the column ordering PostgREST applies.
 *
 * Price sorts run on `base_price` (the list price). A product whose
 * `discounted_price` is live is still ordered by what it normally costs —
 * ordering on the effective price would need a computed column, since
 * PostgREST can only order by real columns.
 */
const SORT_COLUMNS: Record<
  ProductSortOption,
  { column: string; ascending: boolean }
> = {
  default: { column: "name", ascending: true },
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "base_price", ascending: true },
  price_desc: { column: "base_price", ascending: false },
  name_asc: { column: "name", ascending: true },
};

export async function clientGetProducts(
  store_slug: string,
  page: number = 1,
  limit: number = 5,
  categorySlug?: string,
  searchQuery?: string,
  sortOption: ProductSortOption = "default"
): Promise<{ products: Product[]; hasMore: boolean; totalCount: number }> {

  try {
    // Get store ID
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, store_slug")
      .eq("store_slug", store_slug)
      .single();

    if (storeError || !storeData) {
      throw storeError || new Error("Store not found");
    }

    const storeId = storeData.id;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Build base query
    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        description,
        short_description,
        base_price,
        discounted_price,
        featured,
        status,
        product_type,
        categories(id, name, slug),
        product_variants(
          id,
          variant_name,
          base_price,
          discounted_price,
          color,
          is_active,
          product_inventory(quantity_available, quantity_reserved),
          product_images(id, image_url, is_primary)
        ),
        product_images(id, image_url, is_primary),
        product_inventory(quantity_available, quantity_reserved),
        sort_order,
        created_at
      `,
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .eq("status", ProductStatus.ACTIVE);

    // Apply category filter — resolved by slug, so a renamed category doesn't
    // break links already shared with a ?category= in them. Older links (and
    // any caller still passing a display name) still resolve via the name
    // fallback below.
    if (categorySlug && categorySlug !== "all") {
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id")
        .eq("store_id", storeId)
        .eq("slug", categorySlug)
        .maybeSingle();

      const category =
        categoryData ??
        (
          await supabase
            .from("categories")
            .select("id")
            .eq("store_id", storeId)
            .eq("name", categorySlug)
            .maybeSingle()
        ).data;

      if (category) {
        query = query.eq("category_id", category.id);
      }
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim() !== "") {
      const searchTerm = `%${searchQuery}%`;
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm}`
      );
    }

    // Apply pagination and ordering. The default view leads with the order the
    // shop owner dragged the catalog into (products.sort_order), then falls
    // back to A–Z for anything with no position yet; an explicit price/name/
    // newest sort is what the shopper asked for, so it wins outright.
    if (sortOption === "default") {
      query = query.order("sort_order", { ascending: true, nullsFirst: false });
    }

    const sort = SORT_COLUMNS[sortOption] ?? SORT_COLUMNS.newest;
    const { data: products, error: productError, count } = await query
      .order(sort.column, { ascending: sort.ascending })
      .range(start, end);

    if (productError) {
      console.error("Product query error:", productError);
      throw productError;
    }


    // Bundles have no product_inventory row of their own — resolve their
    // computed availability so they don't render as permanently sold out.
    const bundleIds = (products ?? [])
      .filter((p: any) => p.product_type === "bundle")
      .map((p: any) => p.id);
    const [bundleAvailabilityMap, bundleValueMap, bundleConfigurableMap] = bundleIds.length
      ? await Promise.all([
          getBundleAvailabilityMap(bundleIds),
          getBundleComponentValueMap(bundleIds),
          getBundleConfigurableMap(bundleIds),
        ])
      : [new Map<string, number>(), new Map<string, number>(), new Map<string, boolean>()];

    // Map products
    const mappedProducts = (products ?? []).map((p: any) => {
      const primary_image =
        p.product_images?.find((img: any) => img.is_primary) ||
        p.product_images?.[0] ||
        null;
      const baseStock =
        p.product_type === "bundle"
          ? { quantity_available: bundleAvailabilityMap.get(p.id) ?? 0, quantity_reserved: 0 }
          : p.product_inventory?.[0] || { quantity_available: 0, quantity_reserved: 0 };

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        short_description: p.short_description,
        slug: p.slug,
        base_price: Number(p.base_price),
        discounted_price: p.discounted_price
          ? Number(p.discounted_price)
          : null,
        featured: p.featured ?? false,
        status: (p.status as ProductStatus) || ProductStatus.ACTIVE,
        product_type: p.product_type ?? "simple",
        component_value:
          p.product_type === "bundle" ? bundleValueMap.get(p.id) ?? 0 : undefined,
        bundle_has_options:
          p.product_type === "bundle" ? bundleConfigurableMap.get(p.id) ?? false : undefined,
        category: p.categories
          ? { 
              id: p.categories.id, 
              name: p.categories.name,
              slug: p.categories.slug
            }
          : null,
        images: p.product_images?.map((img: any) => img.image_url) || [],
        primary_image,
        product_inventory: baseStock,
        stock: baseStock.quantity_available > 0 ? baseStock : null,
        variants: (p.product_variants ?? [])
          .filter((v: any) => v.is_active)
          .map((v: any) => ({
            id: v.id,
            product_id: p.id,
            variant_name: v.variant_name,
            base_price: Number(v.base_price),
            discounted_price: v.discounted_price
              ? Number(v.discounted_price)
              : null,
            color: v.color,
            is_active: v.is_active ?? true,
            stock: v.product_inventory?.[0] || {
              quantity_available: 0,
              quantity_reserved: 0,
            },
            product_inventory: v.product_inventory?.[0],
            primary_image:
              v.product_images?.find((img: any) => img.is_primary) ||
              v.product_images?.[0] ||
              null,
            product_images: v.product_images ?? [],
          })),
        created_at: p.created_at,
      } as Product;
    });

    // Sort: in-stock first — only on the default ordering, and only where the
    // owner hasn't dragged the catalog into a deliberate order. Once there's
    // either an explicit shopper sort or a manual position to respect, pulling
    // sold-out items down would visibly break the order that was asked for.
    const hasManualOrder = (products ?? []).some(
      (p: any) => p.sort_order !== null && p.sort_order !== undefined,
    );
    const sortedProducts =
      sortOption === "default" && !hasManualOrder
        ? mappedProducts.sort((a, b) => {
            const aInStock = isProductInStock(a);
            const bInStock = isProductInStock(b);
            if (aInStock && !bInStock) return -1;
            if (!aInStock && bInStock) return 1;
            return 0;
          })
        : mappedProducts;

    const hasMore = count ? end + 1 < count : false;

    return {
      products: sortedProducts,
      hasMore,
      totalCount: count || 0,
    };
  } catch (error) {
    console.error("Error in clientGetProducts:", error);
    throw error;
  }
}

function isProductInStock(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.some((variant) => {
      const productInventory = variant.product_inventory?.[0];
      if (productInventory && productInventory.quantity_available > 0) {
        return true;
      }
      const stock = variant.stock;
      if (stock && stock.quantity_available > 0) {
        return true;
      }
      return false;
    });
  }

  const mainProductInventory = product.product_inventory?.[0];
  if (mainProductInventory && mainProductInventory.quantity_available > 0) {
    return true;
  }
  const mainStock = product.stock;
  if (mainStock && mainStock.quantity_available > 0) {
    return true;
  }

  return false;
}