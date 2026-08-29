/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types/product";
import { ProductStatus } from "@/lib/types/enums";
import { getBundleAvailabilityMap } from "@/lib/queries/bundles/getBundleAvailabilityMap";
import { getBundleComponentValueMap } from "@/lib/queries/bundles/getBundleComponentValueMap";
import { getBundleConfigurableMap } from "@/lib/queries/bundles/getBundleConfigurableMap";

/**
 * Products currently running an active, time-boxed flash sale — a
 * discounted_price with a real sale_ends_at window that's still open, as
 * opposed to a permanent markdown (no window set). Powers the storefront's
 * dedicated Flash Sale section, distinct from getFeaturedProducts' curated
 * picks which carry no notion of a sale window at all.
 */
export async function getActiveFlashSaleProducts(
  store_slug: string,
  limit: number = 8
): Promise<Product[]> {
  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("store_slug", store_slug)
    .single();

  if (storeError || !storeData) return [];

  const nowIso = new Date().toISOString();

  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      base_price,
      discounted_price,
      sale_starts_at,
      sale_ends_at,
      status,
      featured,
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
      created_at
    `
    )
    .eq("store_id", storeData.id)
    .eq("status", ProductStatus.ACTIVE)
    .not("discounted_price", "is", null)
    .not("sale_ends_at", "is", null)
    .gte("sale_ends_at", nowIso)
    .or(`sale_starts_at.is.null,sale_starts_at.lte.${nowIso}`)
    .order("sale_ends_at", { ascending: true })
    .limit(limit);

  if (error || !products) return [];

  const bundleIds = products
    .filter((p: any) => p.product_type === "bundle")
    .map((p: any) => p.id);
  const [bundleAvailabilityMap, bundleValueMap, bundleConfigurableMap] = bundleIds.length
    ? await Promise.all([
        getBundleAvailabilityMap(bundleIds),
        getBundleComponentValueMap(bundleIds),
        getBundleConfigurableMap(bundleIds),
      ])
    : [new Map<string, number>(), new Map<string, number>(), new Map<string, boolean>()];

  return products.map((p: any) => {
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
      slug: p.slug,
      description: p.description,
      base_price: Number(p.base_price),
      discounted_price: p.discounted_price ? Number(p.discounted_price) : null,
      sale_starts_at: p.sale_starts_at ?? null,
      sale_ends_at: p.sale_ends_at ?? null,
      status: (p.status as ProductStatus) || ProductStatus.ACTIVE,
      featured: p.featured === true,
      product_type: p.product_type ?? "simple",
      component_value:
        p.product_type === "bundle" ? bundleValueMap.get(p.id) ?? 0 : undefined,
      bundle_has_options:
        p.product_type === "bundle" ? bundleConfigurableMap.get(p.id) ?? false : undefined,
      category: p.categories
        ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
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
          discounted_price: v.discounted_price ? Number(v.discounted_price) : null,
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
}
