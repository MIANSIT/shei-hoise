"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface StoreRatingSummary {
  average: number;
  total: number;
}

/**
 * Lightweight average/count for the store rating badge — the home page
 * teaser and the product page's "rate this seller" prompt both only need
 * this, not the full category breakdown getStoreReviews returns. No
 * is_approved filter — hiding a review only suppresses its text, not its
 * rating, so a vendor can't quietly inflate their average by hiding
 * negative-but-legitimate reviews. Excludes comment-only reviews (no
 * verified purchase, rating null) — only a real rating moves the average.
 */
export async function getStoreRatingSummary(storeId: string): Promise<StoreRatingSummary> {
  const { data, error } = await supabaseAdmin
    .from("store_reviews")
    .select("rating")
    .eq("store_id", storeId)
    .not("rating", "is", null);

  if (error) throw new Error(error.message);

  const ratings = (data ?? []) as { rating: number }[];
  const total = ratings.length;
  const average = total > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / total : 0;

  return { average, total };
}
