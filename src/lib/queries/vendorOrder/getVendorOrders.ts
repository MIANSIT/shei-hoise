import { supabase } from "@/lib/supabase";
import type { VendorOrder, VendorOrderStatus } from "@/lib/types/vendor/type";

export interface VendorOrderQueryParams {
  storeId: string;
  vendorId?: string | null;
  status?: VendorOrderStatus | null;
  search?: string; // invoice number
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
}

export interface VendorOrderQueryResult {
  data: VendorOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getVendorOrders(
  params: VendorOrderQueryParams,
): Promise<VendorOrderQueryResult> {
  const {
    storeId,
    vendorId,
    status,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 10,
  } = params;

  if (!storeId) {
    return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("vendor_orders")
    .select("*, vendor:vendors(id, name, phone, business_name)", {
      count: "exact",
    })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (vendorId) query = query.eq("vendor_id", vendorId);
  if (status) query = query.eq("status", status);
  if (search?.trim()) query = query.ilike("invoice_number", `%${search.trim()}%`);
  if (dateFrom) query = query.gte("order_date", dateFrom);
  if (dateTo) query = query.lte("order_date", dateTo);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching vendor orders:", error.message);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;

  return {
    data: (data as unknown as VendorOrder[]) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
