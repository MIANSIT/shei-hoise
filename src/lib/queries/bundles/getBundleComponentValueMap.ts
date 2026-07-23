"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Sums what a bundle's components would cost bought separately — each
 * component's own current selling price (discounted_price if set, else
 * base_price) times the quantity the recipe needs. This is a reference
 * "worth" figure, distinct from the bundle's own base_price/discounted_price
 * (what's actually charged). Two batched queries total, never N+1.
 */
export async function getBundleComponentValueMap(
  bundleProductIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const ids = [...new Set(bundleProductIds)].filter(Boolean);
  if (ids.length === 0) return result;

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("bundle_items")
    .select("bundle_product_id, component_product_id, component_variant_id, quantity_needed")
    .in("bundle_product_id", ids);
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) {
    ids.forEach((id) => result.set(id, 0));
    return result;
  }

  const componentProductIds = [...new Set(items.map((i) => i.component_product_id))];
  const componentVariantIds = [
    ...new Set(items.map((i) => i.component_variant_id).filter((id): id is string => !!id)),
  ];

  const [{ data: products }, { data: variants }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, base_price, discounted_price")
      .in("id", componentProductIds),
    componentVariantIds.length
      ? supabaseAdmin
          .from("product_variants")
          .select("id, base_price, discounted_price")
          .in("id", componentVariantIds)
      : Promise.resolve({
          data: [] as { id: string; base_price: number; discounted_price: number | null }[],
        }),
  ]);

  const productPriceMap = new Map(
    (products ?? []).map((p) => [p.id, p.discounted_price ?? p.base_price ?? 0])
  );
  const variantPriceMap = new Map(
    (variants ?? []).map((v) => [v.id, v.discounted_price ?? v.base_price ?? 0])
  );

  for (const item of items) {
    const unitPrice = item.component_variant_id
      ? (variantPriceMap.get(item.component_variant_id) ?? 0)
      : (productPriceMap.get(item.component_product_id) ?? 0);
    const current = result.get(item.bundle_product_id) ?? 0;
    result.set(item.bundle_product_id, current + unitPrice * item.quantity_needed);
  }

  return result;
}
