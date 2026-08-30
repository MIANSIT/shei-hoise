"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface VendorStoreReviewItem {
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
  is_approved: boolean;
  created_at: string;
  reviewer_name: string;
}

interface VendorStoreReviewRow {
  id: string;
  rating: number | null;
  product_quality_rating: number | null;
  delivery_rating: number | null;
  service_rating: number | null;
  value_rating: number | null;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  store_customers: { name: string | null } | null;
}

/** Paginated review list for the admin "Reviews" page's Store Reviews tab. */
export async function getVendorStoreReviews({
  storeId,
  page,
  pageSize,
  search,
}: {
  storeId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ data: VendorStoreReviewItem[]; total: number }> {
  let query = supabaseAdmin
    .from("store_reviews")
    .select(
      "id, rating, product_quality_rating, delivery_rating, service_rating, value_rating, review_title, review_text, is_verified_purchase, is_approved, created_at, store_customers(name)",
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (search?.trim()) query = query.ilike("review_text", `%${search.trim()}%`);
  if (page !== undefined && pageSize !== undefined) {
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as VendorStoreReviewRow[];
  const reviews: VendorStoreReviewItem[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    product_quality_rating: r.product_quality_rating,
    delivery_rating: r.delivery_rating,
    service_rating: r.service_rating,
    value_rating: r.value_rating,
    review_title: r.review_title,
    review_text: r.review_text,
    is_verified_purchase: r.is_verified_purchase,
    is_approved: r.is_approved,
    created_at: r.created_at,
    reviewer_name: r.store_customers?.name || "Anonymous",
  }));

  return { data: reviews, total: count ?? 0 };
}
