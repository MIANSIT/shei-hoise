import { supabase } from "@/lib/supabase";
import type { Coupon } from "@/lib/types/coupon";

export interface CouponQueryParams {
  storeId: string;
  search?: string;
  status?: boolean | null;
  page?: number;
  pageSize?: number;
}

export interface CouponQueryResult {
  data: Coupon[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getCoupons(
  params: CouponQueryParams,
): Promise<CouponQueryResult> {
  const { storeId, search, status, page = 1, pageSize = 10 } = params;

  if (!storeId) {
    return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("coupons")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    query = query.ilike("code", `%${search.trim()}%`);
  }

  if (status !== undefined && status !== null) {
    query = query.eq("is_active", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching coupons:", error.message);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;

  return {
    data: (data as Coupon[]) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
