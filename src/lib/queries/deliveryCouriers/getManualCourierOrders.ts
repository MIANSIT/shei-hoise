"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

/** Shape returned by the orders select below, before mapping. */
interface ManualCourierOrderRow {
  id: string;
  order_number: string;
  shipping_address: { customer_name?: string; phone?: string } | null;
  status: string;
  total_amount: number;
  created_at: string;
  store_customers:
    | { name: string | null; phone: string | null }
    | { name: string | null; phone: string | null }[]
    | null;
}

export interface ManualCourierOrderSummary {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

/** Orders tagged with a custom/manual courier by name — no consignment id, no tracking, since there's no API. */
export async function getManualCourierOrders(
  storeId: string,
  courierName: string,
): Promise<ManualCourierOrderSummary[]> {
  // Paged: a single request stops at PGRST_DB_MAX_ROWS (1000), and a busy
  // store can easily put more than that through one manual courier — the
  // oldest consignments would just stop appearing, with no error.
  let data: ManualCourierOrderRow[];
  try {
    data = await fetchAllPaged<ManualCourierOrderRow>((from, to) =>
      supabaseAdmin
        .from("orders")
        .select(
          `id, order_number, shipping_address, status, total_amount, created_at,
           store_customers!customer_id ( name, phone )`,
        )
        .eq("store_id", storeId)
        .eq("courier", courierName)
        .order("created_at", { ascending: false })
        .range(from, to),
    );
  } catch (error) {
    console.error("Error fetching manual courier orders:", error);
    return [];
  }

  return data.map((order) => {
    const customer = Array.isArray(order.store_customers)
      ? order.store_customers[0]
      : order.store_customers;

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      recipientName: order.shipping_address?.customer_name || customer?.name || "",
      recipientPhone: order.shipping_address?.phone || customer?.phone || "",
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
    };
  });
}
