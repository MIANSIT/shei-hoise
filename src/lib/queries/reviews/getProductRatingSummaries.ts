"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface RatingSummary {
  average: number;
  total: number;
}

/**
 * Batched version of getProductRatingSummary for a product grid — one query
 * for every card on the page instead of one per card. No is_approved filter,
 * same reasoning as getProductRatingSummary: a hidden review's rating still
 * counts, only its text is suppressed.
 */
export async function getProductRatingSummaries(
  productIds: string[],
): Promise<Record<string, RatingSummary>> {
  if (productIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("product_reviews")
    .select("product_id, rating")
    .in("product_id", productIds);

  if (error) throw new Error(error.message);

  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const entry = sums.get(row.product_id) ?? { sum: 0, count: 0 };
    entry.sum += row.rating;
    entry.count += 1;
    sums.set(row.product_id, entry);
  }

  const result: Record<string, RatingSummary> = {};
  for (const [productId, { sum, count }] of sums) {
    result[productId] = { average: sum / count, total: count };
  }
  return result;
}
