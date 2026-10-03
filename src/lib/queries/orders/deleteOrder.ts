"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BRANCH_SCOPE_ERROR,
  canUseBranch,
  checkDeleteWindow,
  getAuthorizedStoreId,
  logDeleted,
} from "@/lib/permissions/server";
import { OrderStatus } from "@/lib/types/enums";
import { moveOrderStock } from "./orderStock";

// Statuses whose stock still sits in quantity_reserved (order creation
// reserves it immediately, regardless of payment status — see
// orderService.ts). Deleting one of these orders outright used to be
// blocked in the UI specifically so the reservation wouldn't be orphaned
// forever with no order left to ever release it; releasing it here instead
// means the UI no longer has to force a cancel step first.
const RESERVED_STATUSES: string[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
];


async function releaseReservedStock(orderId: string): Promise<void> {
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);
  // Bundle header rows are skipped by order_stock_move (no stock of their own).
  await moveOrderStock(orderId, items ?? [], "release");
}

export async function deleteOrder(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeResult = await getAuthorizedStoreId("orders.delete");
    if (!storeResult.ok) {
      return { success: false, error: storeResult.error };
    }

    // Full row + items: copied into the activity log before they're gone.
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*, order_items (*)")
      .eq("id", orderId)
      .eq("store_id", storeResult.storeId)
      .single();

    if (fetchError || !order) return { success: false, error: "Order not found" };

    const tooOld = checkDeleteWindow(storeResult.actor, order.created_at);
    if (tooOld) return { success: false, error: tooOld };
    if (order.branch_id && !canUseBranch(storeResult.actor, order.branch_id)) {
      return { success: false, error: BRANCH_SCOPE_ERROR };
    }

    if (RESERVED_STATUSES.includes(order.status)) {
      await releaseReservedStock(orderId);
    }

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", orderId);
    if (itemsError) return { success: false, error: "Failed to delete order items" };

    const { error: deleteError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("store_id", storeResult.storeId);
    if (deleteError) return { success: false, error: "Failed to delete order" };

    await logDeleted(
      storeResult.actor,
      "orders",
      "order",
      order,
      `Deleted order #${order.order_number} (${order.status}, ৳${order.total_amount})`,
    );

    return { success: true };
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
