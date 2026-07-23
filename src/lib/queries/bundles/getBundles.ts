"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBundleAvailabilityMap } from "./getBundleAvailabilityMap";
import { getBundleComponentValueMap } from "./getBundleComponentValueMap";

export interface BundleListItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  base_price: number;
  discounted_price: number | null;
  featured: boolean;
  status: string;
  primary_image: { image_url: string } | null;
  component_count: number;
  available: number;
  /** What the components would cost bought separately — for comparison against base_price/discounted_price. */
  component_value: number;
}

/** Paginated bundle list for the admin "Bundles" page — mirrors getProductsWithVariants's shape. */
export async function getBundles({
  storeId,
  search,
  page,
  pageSize,
}: {
  storeId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: BundleListItem[]; total: number }> {
  let query = supabaseAdmin
    .from("products")
    .select(
      `
      id, name, slug, sku, base_price, discounted_price, featured, status,
      product_images(image_url, is_primary),
      bundle_items!bundle_items_bundle_product_id_fkey(id)
      `,
      { count: "exact" }
    )
    .eq("store_id", storeId)
    .eq("product_type", "bundle")
    .order("created_at", { ascending: false });

  if (search?.trim()) query = query.ilike("name", `%${search.trim()}%`);
  if (page !== undefined && pageSize !== undefined) {
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const bundleIds = (data ?? []).map((b) => b.id);
  const [availabilityMap, componentValueMap] = await Promise.all([
    getBundleAvailabilityMap(bundleIds),
    getBundleComponentValueMap(bundleIds),
  ]);

  const bundles: BundleListItem[] = (data ?? []).map((b) => {
    const images = b.product_images ?? [];
    const primary = images.find((img) => img.is_primary) ?? images[0] ?? null;
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      sku: b.sku,
      base_price: Number(b.base_price),
      discounted_price: b.discounted_price,
      featured: b.featured === true,
      status: b.status,
      primary_image: primary ? { image_url: primary.image_url } : null,
      component_count: (b.bundle_items ?? []).length,
      available: availabilityMap.get(b.id) ?? 0,
      component_value: componentValueMap.get(b.id) ?? 0,
    };
  });

  return { data: bundles, total: count ?? 0 };
}
