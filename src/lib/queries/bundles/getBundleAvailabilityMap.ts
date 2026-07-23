"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Computes how many of each bundle can currently be sold:
 *   min over slots of (max over each slot's options of floor(available / needed))
 * A "slot" is either a single fixed component, or a choice group of
 * alternatives sharing an option_group_id (the bundle is sellable as long
 * as at least one alternative in the group has stock). Two batched queries
 * total regardless of how many bundles are asked for — never N+1. Bundles
 * with no recipe rows (shouldn't happen, but defensively) resolve to 0.
 */
export async function getBundleAvailabilityMap(
  bundleProductIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const ids = [...new Set(bundleProductIds)].filter(Boolean);
  if (ids.length === 0) return result;

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("bundle_items")
    .select(
      "id, bundle_product_id, component_product_id, component_variant_id, quantity_needed, option_group_id"
    )
    .in("bundle_product_id", ids);
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) {
    ids.forEach((id) => result.set(id, 0));
    return result;
  }

  const componentProductIds = [
    ...new Set(items.map((i) => i.component_product_id)),
  ];
  const { data: inventoryRows, error: invError } = await supabaseAdmin
    .from("product_inventory")
    .select("product_id, variant_id, quantity_available")
    .in("product_id", componentProductIds);
  if (invError) throw new Error(invError.message);

  const inventoryKey = (productId: string, variantId: string | null) =>
    `${productId}-${variantId || "none"}`;
  const inventoryMap = new Map(
    (inventoryRows ?? []).map((row) => [
      inventoryKey(row.product_id, row.variant_id),
      row.quantity_available ?? 0,
    ])
  );

  const itemsByBundle = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByBundle.get(item.bundle_product_id) ?? [];
    list.push(item);
    itemsByBundle.set(item.bundle_product_id, list);
  }

  for (const id of ids) {
    const recipe = itemsByBundle.get(id);
    if (!recipe || recipe.length === 0) {
      result.set(id, 0);
      continue;
    }
    // Rows sharing an option_group_id are alternatives for one slot — the
    // bundle can be fulfilled as long as at least one alternative has
    // stock, so a slot's availability is the MAX across its options.
    // Ungrouped rows are their own singleton slot (unchanged behavior).
    // Overall bundle availability is the MIN across slots, same as before.
    const bySlot = new Map<string, typeof recipe>();
    for (const component of recipe) {
      const slotKey = component.option_group_id ?? component.id;
      const slot = bySlot.get(slotKey) ?? [];
      slot.push(component);
      bySlot.set(slotKey, slot);
    }
    const slotAvailability = [...bySlot.values()].map((options) =>
      Math.max(
        ...options.map((component) => {
          const have = inventoryMap.get(
            inventoryKey(component.component_product_id, component.component_variant_id)
          ) ?? 0;
          return Math.floor(have / component.quantity_needed);
        })
      )
    );
    result.set(id, Math.max(0, Math.min(...slotAvailability)));
  }

  return result;
}
