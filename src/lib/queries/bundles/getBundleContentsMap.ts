"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BundleItem } from "@/lib/types/product";

/**
 * Fetches the "what's inside" recipe for a set of bundles, with component
 * display details (name, price, image) resolved — used by the storefront
 * product page and cart line, and to pre-populate the admin edit form.
 * Two batched queries total, never N+1.
 */
export async function getBundleContentsMap(
  bundleProductIds: string[]
): Promise<Map<string, BundleItem[]>> {
  const result = new Map<string, BundleItem[]>();
  const ids = [...new Set(bundleProductIds)].filter(Boolean);
  if (ids.length === 0) return result;

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("bundle_items")
    .select(
      "id, bundle_product_id, component_product_id, component_variant_id, quantity_needed"
    )
    .in("bundle_product_id", ids);
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) return result;

  const componentProductIds = [
    ...new Set(items.map((i) => i.component_product_id)),
  ];
  const { data: components, error: productsError } = await supabaseAdmin
    .from("products")
    .select(
      "id, name, base_price, product_images(id, image_url, is_primary, variant_id)"
    )
    .in("id", componentProductIds);
  if (productsError) throw new Error(productsError.message);

  const componentMap = new Map((components ?? []).map((c) => [c.id, c]));

  for (const item of items) {
    const product = componentMap.get(item.component_product_id);
    const primaryImage =
      product?.product_images?.find((img) => img.is_primary) ??
      product?.product_images?.[0] ??
      null;

    const bundleItem: BundleItem = {
      id: item.id,
      bundle_product_id: item.bundle_product_id,
      component_product_id: item.component_product_id,
      component_variant_id: item.component_variant_id,
      quantity_needed: item.quantity_needed,
      component: product
        ? {
            id: product.id,
            name: product.name,
            base_price: product.base_price,
            primary_image: primaryImage
              ? {
                  id: primaryImage.id,
                  product_id: item.component_product_id,
                  variant_id: primaryImage.variant_id,
                  image_url: primaryImage.image_url,
                  alt_text: null,
                  is_primary: primaryImage.is_primary,
                }
              : null,
          }
        : undefined,
    };

    const list = result.get(item.bundle_product_id) ?? [];
    list.push(bundleItem);
    result.set(item.bundle_product_id, list);
  }

  return result;
}
