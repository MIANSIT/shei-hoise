"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Which bundles require the customer to pick between alternatives for at
 * least one slot (bundle_items sharing an option_group_id), vs. bundles
 * whose contents are entirely fixed. Card-level quick-add needs this the
 * same way it needs to know about variants — a fixed bundle can be added
 * directly, a configurable one has to send the customer to the PDP to
 * choose, or it silently adds with the choice missing (see bundleSchema.ts /
 * bundleSelectionIncomplete on the PDP for how that's enforced there).
 */
export async function getBundleConfigurableMap(
  bundleProductIds: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const ids = [...new Set(bundleProductIds)].filter(Boolean);
  if (ids.length === 0) return result;
  ids.forEach((id) => result.set(id, false));

  const { data: items, error } = await supabaseAdmin
    .from("bundle_items")
    .select("bundle_product_id, option_group_id")
    .in("bundle_product_id", ids)
    .not("option_group_id", "is", null);
  if (error) throw new Error(error.message);

  (items ?? []).forEach((item) => result.set(item.bundle_product_id, true));
  return result;
}
