"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface RatingSummary {
  average: number;
  total: number;
}

/**
 * Lightweight average/count for the star badge next to a product's name.
 * No is_approved filter — hiding a review only suppresses its text, not
 * its rating, so a vendor can't quietly inflate their average by hiding
 * negative-but-legitimate reviews.
 */
export async function getProductRatingSummary(productId: string): Promise<RatingSummary> {
  const { data, error } = await supabaseAdmin
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId);

  if (error) throw new Error(error.message);

  const ratings = data ?? [];
  const total = ratings.length;
  const average = total > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / total : 0;

  return { average, total };
}
