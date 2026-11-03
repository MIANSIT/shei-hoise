import { supabaseAdmin } from "@/lib/supabase/admin";

/*
 * The order a product's variants were arranged in (drag or arrows on the product form).
 * Server-only helpers used by the product queries; deliberately not a "use server" file,
 * so the browser cannot call them. Both are safe before migration 20261119 is applied:
 * saving is skipped and reading returns nothing, so variants stay in their old order.
 */

/**
 * Saves the position of each variant, first to last.
 * @param orderedVariantIds the product's variant ids in the order they should show
 */
export async function saveVariantOrder(orderedVariantIds: string[]): Promise<void> {
  if (orderedVariantIds.length < 2) return;
  try {
    const results = await Promise.all(
      orderedVariantIds.map((id, index) => supabaseAdmin.from("product_variants").update({ sort_order: index }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) console.error("Saving the variant order failed (is migration 20261119 applied?):", failed.error.message);
  } catch (error) {
    console.error("Saving the variant order failed:", error);
  }
}

/**
 * Each variant's saved position for one product.
 * @returns variant id to position; empty when none is saved or the column is missing
 */
export async function getVariantOrder(productId: string): Promise<Map<string, number>> {
  const order = new Map<string, number>();
  try {
    const { data, error } = await supabaseAdmin.from("product_variants").select("id, sort_order").eq("product_id", productId);
    if (error) return order;
    for (const row of (data ?? []) as { id: string; sort_order: number | null }[]) {
      if (typeof row.sort_order === "number") order.set(row.id, row.sort_order);
    }
  } catch {
    // Column not there yet: keep the old order.
  }
  return order;
}

/** The variants in their saved order; any without a saved position keep their place at the end. */
export function sortVariantsByOrder<T extends { id?: string | null }>(variants: T[], order: Map<string, number>): T[] {
  if (order.size === 0) return variants;
  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => {
      const pa = (a.variant.id ? order.get(a.variant.id) : undefined) ?? Number.MAX_SAFE_INTEGER;
      const pb = (b.variant.id ? order.get(b.variant.id) : undefined) ?? Number.MAX_SAFE_INTEGER;
      return pa === pb ? a.index - b.index : pa - pb;
    })
    .map((entry) => entry.variant);
}
