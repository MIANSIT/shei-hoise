import { supabase } from "@/lib/supabase";
import type { VendorSettlement } from "@/lib/types/vendor/type";

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
