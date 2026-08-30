"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface StoreReview {
  id: string;
  /** Null for a comment-only review (no verified purchase). */
  rating: number | null;
  product_quality_rating: number | null;
  delivery_rating: number | null;
  service_rating: number | null;
  value_rating: number | null;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  reviewer_name: string;
}

export interface StoreReviewsPage {
  reviews: StoreReview[];
  /** Approved reviews only — what's actually paginated/loaded as cards. */
  total: number;
  /** All reviews regardless of approval — a hidden review's rating still
   *  counts toward the average, only its text is hidden. Matches
   *  getStoreRatingSummary's total. */
  ratingTotal: number;
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  categoryAverages: {
    product_quality: number;
    delivery: number;
    service: number;
    value: number;
  };
}

interface StoreReviewRow {
  id: string;
  rating: number | null;
  product_quality_rating: number | null;
  delivery_rating: number | null;
  service_rating: number | null;
  value_rating: number | null;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  store_customers: { name: string | null } | null;
}

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

/** Paginated approved reviews for a store's storefront reviews section. */
export async function getStoreReviews(
  storeId: string,
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {},
): Promise<StoreReviewsPage> {
  const from = (page - 1) * pageSize;

  const [{ data, error, count }, { data: allRatings, error: ratingsError }] =
    await Promise.all([
      supabaseAdmin
        .from("store_reviews")
        .select(
          "id, rating, product_quality_rating, delivery_rating, service_rating, value_rating, review_title, review_text, is_verified_purchase, created_at, store_customers(name)",
          { count: "exact" },
        )
        .eq("store_id", storeId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1),
      // No is_approved filter — a hidden review's rating still counts
      // toward the average and breakdown; only its text is suppressed.
      // Excludes comment-only reviews (rating null, no verified purchase).
      supabaseAdmin
        .from("store_reviews")
        .select("rating, product_quality_rating, delivery_rating, service_rating, value_rating")
        .eq("store_id", storeId)
        .not("rating", "is", null),
    ]);

  if (error) throw new Error(error.message);
  if (ratingsError) throw new Error(ratingsError.message);

  const ratingCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const productQuality: number[] = [];
  const delivery: number[] = [];
  const service: number[] = [];
  const value: number[] = [];

  for (const r of allRatings ?? []) {
    const rating = r.rating as 1 | 2 | 3 | 4 | 5;
    if (ratingCounts[rating] !== undefined) ratingCounts[rating] += 1;
    if (r.product_quality_rating != null) productQuality.push(r.product_quality_rating);
    if (r.delivery_rating != null) delivery.push(r.delivery_rating);
    if (r.service_rating != null) service.push(r.service_rating);
    if (r.value_rating != null) value.push(r.value_rating);
  }

  const rows = (data ?? []) as unknown as StoreReviewRow[];
  const reviews: StoreReview[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    product_quality_rating: r.product_quality_rating,
    delivery_rating: r.delivery_rating,
    service_rating: r.service_rating,
    value_rating: r.value_rating,
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
    categoryAverages: {
      product_quality: average(productQuality),
      delivery: average(delivery),
      service: average(service),
      value: average(value),
    },
  };
}
