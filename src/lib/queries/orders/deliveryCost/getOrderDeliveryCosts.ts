"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export interface OrderDeliveryCost {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  createdByName: string | null;
}

interface DatabaseDeliveryCost {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  users: { first_name: string; last_name: string } | null;
}

/** Full revision history for one order, newest first — see order_delivery_costs' migration for why this is a history rather than a single column. */
export async function getOrderDeliveryCosts(orderId: string): Promise<OrderDeliveryCost[]> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return [];

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("store_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order || order.store_id !== storeResult.storeId) return [];

  const { data, error } = await supabaseAdmin
    .from("order_delivery_costs")
    .select("id, amount, note, created_at, users(first_name, last_name)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch order delivery costs:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as DatabaseDeliveryCost[];
  return rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    note: r.note,
    createdAt: r.created_at,
    createdByName: r.users ? `${r.users.first_name} ${r.users.last_name}`.trim() : null,
  }));
}
