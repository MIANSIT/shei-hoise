"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

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
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `id, order_number, shipping_address, status, total_amount, created_at,
       store_customers!customer_id ( name, phone )`,
    )
    .eq("store_id", storeId)
    .eq("courier", courierName)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching manual courier orders:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((order) => {
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
