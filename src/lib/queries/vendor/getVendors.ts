import { supabase } from "@/lib/supabase";
import type { Vendor } from "@/lib/types/vendor/type";

export interface VendorQueryParams {
  storeId: string;
  search?: string;
  status?: "active" | "inactive" | null;
  page?: number;
  pageSize?: number;
}

export interface VendorQueryResult {
  data: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getVendors(
  params: VendorQueryParams,
): Promise<VendorQueryResult> {
  const { storeId, search, status, page = 1, pageSize = 10 } = params;

  if (!storeId) {
    return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `name.ilike."${term}",phone.ilike."${term}",business_name.ilike."${term}"`,
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching vendors:", error.message);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;

  return {
    data: (data as Vendor[]) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
