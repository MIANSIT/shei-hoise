import { supabase } from "@/lib/supabase";
import type { VendorOrder } from "@/lib/types/vendor/type";

export async function getVendorOrderById(
  id: string,
  storeId: string,
): Promise<VendorOrder | null> {
  const { data, error } = await supabase
    .from("vendor_orders")
    .select(
      "*, vendor:vendors(id, name, phone, address, business_name), items:vendor_order_items(*)",
    )
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching vendor order:", error.message);
    return null;
  }

  return data as unknown as VendorOrder | null;
}
