import { supabase } from "@/lib/supabase";

/**
 * Every category a set of products sits in (main one first), for deciding which category coupons apply to them.
 * Uses products.category_ids (migration 20261210) and falls back to the main category on a database without it.
 * Never throws: on any failure the map is empty and callers fall back to the main category they already have.
 * @returns product id → its category ids
 */
export async function getProductCategoryIds(productIds: readonly string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return result;
  try {
    const full = await supabase.from("products").select("id, category_id, category_ids").in("id", ids);
    if (!full.error) {
      for (const p of (full.data ?? []) as { id: string; category_id: string | null; category_ids: string[] | null }[]) {
        result.set(p.id, p.category_ids && p.category_ids.length > 0 ? p.category_ids : p.category_id ? [p.category_id] : []);
      }
      return result;
    }
    const basic = await supabase.from("products").select("id, category_id").in("id", ids);
    for (const p of (basic.data ?? []) as { id: string; category_id: string | null }[]) {
      result.set(p.id, p.category_id ? [p.category_id] : []);
    }
  } catch {
    /* the preview then uses the main category */
  }
  return result;
}
