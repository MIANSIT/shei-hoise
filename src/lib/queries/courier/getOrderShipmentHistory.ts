"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface OrderShipmentHistoryEntry {
  trackingId: string;
  courier: string;
  consignmentId: string;
  status: string | null;
  createdAt: string;
}

/** Past (inactive) shipment attempts on one order — the active one is already shown by the main panel, this is just the history below it. */
export async function getOrderShipmentHistory(
  orderId: string,
): Promise<OrderShipmentHistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("courier_tracking")
    .select("id, courier, consignment_id, status, created_at")
    .eq("order_id", orderId)
    .eq("is_active", false)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching order shipment history:", error);
    return [];
  }

  return data.map((row) => ({
    trackingId: row.id,
    courier: row.courier,
    consignmentId: row.consignment_id,
    status: row.status,
    createdAt: row.created_at,
  }));
}
