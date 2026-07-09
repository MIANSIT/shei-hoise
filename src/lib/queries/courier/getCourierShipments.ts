"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CourierType } from "./getConnectedCourierAccounts";
import type { PathaoShipmentDetails } from "@/lib/queries/pathao/createPathaoShipment";
import type { SteadfastShipmentDetails } from "@/lib/queries/steadfast/createSteadfastShipment";

export type CourierShipmentDetails = PathaoShipmentDetails | SteadfastShipmentDetails;

export interface CourierShipmentSummary {
  trackingId: string;
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  consignmentId: string;
  orderStatus: string | null;
  credentialId: string | null;
  accountLabel: string | null;
  courier: CourierType;
  isActive: boolean;
  totalAmount: number;
  createdAt: string;
  details: CourierShipmentDetails | null;
}

/**
 * Every shipment attempt made via the given courier, newest first — active
 * and past/replaced ones alike, since a cancelled shipment that got switched
 * away from is still real history, not something to hide. Sourced from
 * courier_tracking, the source of truth for shipment data.
 */
export async function getCourierShipments(
  storeId: string,
  courier: CourierType,
): Promise<CourierShipmentSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("courier_tracking")
    .select(
      `id, order_id, consignment_id, status, courier_credential_id, shipment_details, is_active, created_at,
       orders!order_id ( order_number, shipping_address, total_amount, store_customers!customer_id ( name, phone ) ),
       store_courier_credentials!courier_credential_id ( label )`,
    )
    .eq("store_id", storeId)
    .eq("courier", courier)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching courier shipments:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const customer = Array.isArray(order?.store_customers)
      ? order.store_customers[0]
      : order?.store_customers;
    const credential = Array.isArray(row.store_courier_credentials)
      ? row.store_courier_credentials[0]
      : row.store_courier_credentials;

    return {
      trackingId: row.id,
      orderId: row.order_id,
      orderNumber: order?.order_number ?? "",
      recipientName: order?.shipping_address?.customer_name || customer?.name || "",
      recipientPhone: order?.shipping_address?.phone || customer?.phone || "",
      consignmentId: row.consignment_id,
      orderStatus: row.status,
      credentialId: row.courier_credential_id,
      accountLabel: credential?.label ?? null,
      courier: courier,
      isActive: row.is_active,
      totalAmount: order?.total_amount ?? 0,
      createdAt: row.created_at,
      details: row.shipment_details ?? null,
    };
  });
}
