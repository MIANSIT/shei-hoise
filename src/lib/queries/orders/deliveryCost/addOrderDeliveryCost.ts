"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export interface AddOrderDeliveryCostResult {
  success: boolean;
  error?: string;
}

/**
 * Records what the courier actually charged for an order, as a new history
 * row (not an overwrite) — see order_delivery_costs' migration for why: a
 * courier cost is often revised after an initial estimate, and the most
 * recent row is what the P&L dashboard's gross_profit uses against
 * shipping_fee to compute real shipping profit/loss.
 */
export async function addOrderDeliveryCost(
  orderId: string,
  amount: number,
  note?: string | null,
): Promise<AddOrderDeliveryCostResult> {
  try {
    if (!(amount >= 0)) {
      return { success: false, error: "Amount must be zero or greater" };
    }

    const storeResult = await getAuthenticatedStoreId();
    if (!storeResult.ok) return { success: false, error: storeResult.error };

    // order_delivery_costs has no RLS write policy (all writes go through
    // this service-role action) — confirm the order actually belongs to the
    // caller's store before inserting against it.
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("store_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order || order.store_id !== storeResult.storeId) {
      return { success: false, error: "Order not found" };
    }

    const {
      data: { user },
    } = await createClient().auth.getUser();

    const { error: insertError } = await supabaseAdmin.from("order_delivery_costs").insert({
      order_id: orderId,
      store_id: storeResult.storeId,
      amount,
      note: note || null,
      created_by: user?.id ?? null,
    });

    if (insertError) return { success: false, error: insertError.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record delivery cost",
    };
  }
}
