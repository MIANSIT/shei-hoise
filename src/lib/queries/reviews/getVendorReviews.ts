"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface VendorReviewItem {
  id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  reviewer_name: string;
  product: { id: string; name: string; slug: string } | null;
}

interface VendorReviewRow {
  id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  store_customers: { name: string | null } | null;
  products: { id: string; name: string; slug: string } | null;
}

/** Paginated review list for the admin "Reviews" page, scoped to the store's own products. */
export async function getVendorReviews({
  storeId,
  page,
  pageSize,
  search,
}: {
  storeId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ data: VendorReviewItem[]; total: number }> {
  let query = supabaseAdmin
    .from("product_reviews")
    .select(
      "id, rating, review_title, review_text, is_verified_purchase, is_approved, created_at, store_customers(name), products!inner(id, name, slug, store_id)",
      { count: "exact" },
    )
    .eq("products.store_id", storeId)
    .order("created_at", { ascending: false });

  if (search?.trim()) query = query.ilike("review_text", `%${search.trim()}%`);
  if (page !== undefined && pageSize !== undefined) {
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as VendorReviewRow[];
  const reviews: VendorReviewItem[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    review_title: r.review_title,
    review_text: r.review_text,
    is_verified_purchase: r.is_verified_purchase,
    is_approved: r.is_approved,
    created_at: r.created_at,
    reviewer_name: r.store_customers?.name || "Anonymous",
    product: r.products
      ? { id: r.products.id, name: r.products.name, slug: r.products.slug }
      : null,
  }));

  return { data: reviews, total: count ?? 0 };
}
