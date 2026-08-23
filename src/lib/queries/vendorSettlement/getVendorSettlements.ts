import { supabase } from "@/lib/supabase";
import type { VendorSettlement, VendorSettlementListItem } from "@/lib/types/vendor/type";

interface DbSettlementItem {
  id: string;
  settlement_id: string;
  product_id: string;
  variant_id: string | null;
  sold_quantity: number;
  returned_quantity: number;
  unit_price: number;
  receivable_amount: number;
  product: { name: string } | null;
}

interface DbSettlement extends Omit<VendorSettlement, "items"> {
  items: DbSettlementItem[];
}

export async function getVendorSettlements(
  vendorId: string,
): Promise<VendorSettlement[]> {
  const { data, error } = await supabase
    .from("vendor_settlements")
    .select(
      `
      *,
      items:vendor_settlement_items(
        id, settlement_id, product_id, variant_id, sold_quantity, returned_quantity, unit_price, receivable_amount,
        product:products(name)
      )
    `,
    )
    .eq("vendor_id", vendorId)
    .order("settlement_date", { ascending: false });

  if (error) {
    console.error("Error fetching vendor settlements:", error.message);
    return [];
  }

  return ((data as unknown as DbSettlement[]) ?? []).map((settlement) => ({
    ...settlement,
    items: settlement.items.map((item) => ({
      ...item,
      product_name: item.product?.name,
    })),
  }));
}

export interface VendorSettlementListParams {
  storeId: string;
  vendorId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface VendorSettlementListResult {
  data: VendorSettlementListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Store-wide settlement history for the "All Vendor Settlements" page —
// same shape/pattern as getVendorOrders.ts's list query.
export async function getVendorSettlementsList(
  params: VendorSettlementListParams,
): Promise<VendorSettlementListResult> {
  const { storeId, vendorId, page = 1, pageSize = 10 } = params;

  if (!storeId) {
    return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("vendor_settlements")
    .select(
      `
      *,
      items:vendor_settlement_items(sold_quantity, returned_quantity),
      vendor:vendors(id, name, phone, business_name),
      payments:vendor_payments(payment_method)
    `,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .order("settlement_date", { ascending: false })
    .range(from, to);

  if (vendorId) query = query.eq("vendor_id", vendorId);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching vendor settlements list:", error.message);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;

  return {
    data: (data as unknown as VendorSettlementListItem[]) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
