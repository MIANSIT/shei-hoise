"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ProductReview {
  id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  reviewer_name: string;
}

export interface ProductReviewsPage {
  reviews: ProductReview[];
  /** Approved reviews only — what's actually paginated/loaded as cards. */
  total: number;
  /** All reviews regardless of approval — a hidden review's rating still
   *  counts toward the average, only its text is hidden. Matches
   *  getProductRatingSummary's total. */
  ratingTotal: number;
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface ReviewRow {
  id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  store_customers: { name: string | null } | null;
}

/** Paginated approved reviews for a product's storefront reviews section. */
export async function getProductReviews(
  productId: string,
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {},
): Promise<ProductReviewsPage> {
  const from = (page - 1) * pageSize;

  const [{ data, error, count }, { data: allRatings, error: ratingsError }] =
    await Promise.all([
      supabaseAdmin
        .from("product_reviews")
        .select(
          "id, rating, review_title, review_text, is_verified_purchase, created_at, store_customers(name)",
          { count: "exact" },
        )
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1),
      // No is_approved filter — a hidden review's rating still counts
      // toward the average and breakdown; only its text is suppressed.
      supabaseAdmin.from("product_reviews").select("rating").eq("product_id", productId),
    ]);

  if (error) throw new Error(error.message);
  if (ratingsError) throw new Error(ratingsError.message);

  const ratingCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allRatings ?? []) {
    const rating = r.rating as 1 | 2 | 3 | 4 | 5;
    if (ratingCounts[rating] !== undefined) ratingCounts[rating] += 1;
  }

  const rows = (data ?? []) as unknown as ReviewRow[];
  const reviews: ProductReview[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    review_title: r.review_title,
    review_text: r.review_text,
    is_verified_purchase: r.is_verified_purchase,
    created_at: r.created_at,
    reviewer_name: r.store_customers?.name || "Anonymous",
  }));

  return {
    reviews,
    total: count ?? 0,
    ratingTotal: allRatings?.length ?? 0,
    ratingCounts,
  };
}
