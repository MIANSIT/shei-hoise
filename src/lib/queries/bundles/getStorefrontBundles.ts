import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types/product";
import { ProductStatus } from "@/lib/types/enums";
import { getBundleAvailabilityMap } from "./getBundleAvailabilityMap";
import { getBundleComponentValueMap } from "./getBundleComponentValueMap";

/**
 * Active bundles for a store's storefront — its own dedicated section, not
 * tied to the "Featured" flag the way the homepage's main product grid is.
 */
export async function getStorefrontBundles(
  store_slug: string,
  limit: number = 8
): Promise<Product[]> {
  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("store_slug", store_slug)
    .single();

  if (storeError || !storeData) return [];

  const { data: bundles, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      base_price,
      discounted_price,
      status,
      featured,
      categories(id, name, slug),
      product_images(id, image_url, is_primary),
      created_at
    `
    )
    .eq("store_id", storeData.id)
    .eq("status", ProductStatus.ACTIVE)
    .eq("product_type", "bundle")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !bundles) return [];

  const bundleIds = bundles.map((b) => b.id);
  const [availabilityMap, valueMap] = bundleIds.length
    ? await Promise.all([
        getBundleAvailabilityMap(bundleIds),
        getBundleComponentValueMap(bundleIds),
      ])
    : [new Map<string, number>(), new Map<string, number>()];

  return bundles.map((b) => {
    const images = b.product_images ?? [];
    const rawPrimary = images.find((img) => img.is_primary) ?? images[0] ?? null;
    const available = availabilityMap.get(b.id) ?? 0;
    const stock = { quantity_available: available, quantity_reserved: 0 };
    const categories = Array.isArray(b.categories) ? b.categories[0] : b.categories;

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description ?? undefined,
      base_price: Number(b.base_price),
      discounted_price: b.discounted_price ? Number(b.discounted_price) : null,
      featured: b.featured === true,
      product_type: "bundle",
      component_value: valueMap.get(b.id) ?? 0,
      category: categories ? { id: categories.id, name: categories.name } : null,
      images: images.map((img) => img.image_url),
      primary_image: rawPrimary
        ? {
            id: rawPrimary.id,
            product_id: b.id,
            variant_id: null,
            image_url: rawPrimary.image_url,
            alt_text: null,
            is_primary: rawPrimary.is_primary,
          }
        : null,
      product_inventory: [stock],
      stock: available > 0 ? stock : null,
      variants: [],
    } as Product;
  });
}
