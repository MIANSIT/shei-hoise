"use server";
// lib/queries/orders/bulkUpdateOrders.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
} from "@/lib/types/enums";
import {
  checkOrderChange,
  getAuthorizedStoreId,
  logOrderChange,
  type OrderChange,
} from "@/lib/permissions/server";
import { recordOrderOutcome } from "@/lib/utils/riskScoring";
import { handleOrderReturned } from "@/lib/queries/orders/handleOrderReturned";
import { moveOrderStock } from "./orderStock";

export interface BulkUpdateData {
  orderIds: string[];
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  delivery_option?: DeliveryOption;
  payment_method?: string;
  notes?: string;
}

export interface BulkUpdateResult {
  success: boolean;
  error?: string;
  updatedCount?: number;
  message?: string;
}

interface UpdatePayload {
  updated_at: string;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  delivery_option?: DeliveryOption;
  payment_method?: string;
  notes?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_details: Record<string, unknown> | null;
}

interface InventoryUpdate {
  available: number;
  reserved: number;
}

export async function bulkUpdateOrders(
  updateData: BulkUpdateData
): Promise<BulkUpdateResult> {
  try {
    const storeResult = await getAuthorizedStoreId("orders.view");
    if (!storeResult.ok) {
      return { success: false, error: storeResult.error };
    }
    const storeId = storeResult.storeId;

    // Validate input
    if (
      !updateData.orderIds ||
      !Array.isArray(updateData.orderIds) ||
      updateData.orderIds.length === 0
    ) {
      return {
        success: false,
        error: "No order IDs provided for bulk update",
      };
    }

    // Check if at least one field is being updated
    const { status, payment_status, delivery_option, payment_method, notes } =
      updateData;
    if (
      !status &&
      !payment_status &&
      !delivery_option &&
      !payment_method &&
      !notes
    ) {
      return {
        success: false,
        error: "No update fields provided",
      };
    }

    // Every selected order must pass the caller's role rules (e.g. a role
    // that can only cancel pending orders can't bulk-cancel shipped ones).
    const { data: ordersToCheck } = await supabaseAdmin
      .from("orders")
      // "*" rather than a column list so this keeps working whether or not
      // the branch columns (20261003000000) exist yet.
      .select("*")
      .in("id", updateData.orderIds)
      .eq("store_id", storeId);
    const changesByOrder = (ordersToCheck ?? []).map((order) => {
      const change: OrderChange = {
        fromStatus: order.status,
        branchId: order.branch_id ?? null,
        toStatus: status,
        paymentStatusChanged: !!payment_status && payment_status !== order.payment_status,
        toPaymentStatus: payment_status,
        otherFieldsChanged: !!(delivery_option || payment_method || notes),
      };
      return { order, change };
    });
    for (const { order, change } of changesByOrder) {
      const denied = checkOrderChange(storeResult.actor, change);
      if (denied) return { success: false, error: `#${order.order_number}: ${denied}` };
    }

    // Prepare update data with proper typing
    const updatePayload: UpdatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (payment_status) updatePayload.payment_status = payment_status;
    if (delivery_option) updatePayload.delivery_option = delivery_option;
    if (payment_method) updatePayload.payment_method = payment_method;
    if (notes) updatePayload.notes = notes;

    // Capture each order's status BEFORE overwriting it — needed to work out
    // which orders are actually changing status (and from what), so a mixed
    // batch that includes already-cancelled/already-delivered orders doesn't
    // get their stock reversed/deducted a second time. Also captures
    // payment_status/customer_id/phone up front — needed for the returned-
    // status auto-refund and risk-scoring side effects below, which are
    // per-order (unlike the rest of this bulk update, which writes one
    // shared payload to every selected row).
    let previousStatusByOrderId: Record<string, string> = {};
    let previousOrderInfoById: Record<
      string,
      { payment_status: string; customer_id: string | null; phone: string | null }
    > = {};
    if (status) {
      const { data: existingOrders } = await supabaseAdmin
        .from("orders")
        .select("id, status, payment_status, customer_id, shipping_address")
        .in("id", updateData.orderIds)
        .eq("store_id", storeId);

      previousStatusByOrderId = Object.fromEntries(
        (existingOrders || []).map((o) => [o.id, o.status])
      );
      previousOrderInfoById = Object.fromEntries(
        (existingOrders || []).map((o) => [
          o.id,
          {
            payment_status: o.payment_status,
            customer_id: o.customer_id,
            phone: (o.shipping_address as { phone?: string } | null)?.phone ?? null,
          },
        ])
      );
    }

    // Perform bulk update — scoped to the caller's own store, so any ids in
    // the batch that belong to a different store are silently excluded
    // rather than updated.
    const {
      data: updatedOrders,
      error: updateError,
      count,
    } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .in("id", updateData.orderIds)
      .eq("store_id", storeId)
      .select(
        "id, status, payment_status, delivery_option, payment_method, notes"
      )
      .limit(1000); // Safety limit

    if (updateError) {
      console.error("Error in bulk update:", updateError);
      return {
        success: false,
        error: `Failed to update orders: ${updateError.message}`,
      };
    }

    const updatedCount = updatedOrders?.length || 0;


    // Handle inventory updates for status changes if needed — only for
    // orders whose status is actually changing, not ones already sitting in
    // the target status.
    if (status) {
      // Derived from updatedOrders (what the store-scoped update actually
      // touched), not the raw input orderIds — otherwise ids belonging to a
      // different store would still trigger inventory/courier side-effects
      // even though the update itself correctly skipped them.
      const updatedIds = new Set((updatedOrders ?? []).map((o) => o.id));
      const changedOrderIds = updateData.orderIds.filter(
        (id) => updatedIds.has(id) && previousStatusByOrderId[id] !== status
      );
      if (changedOrderIds.length > 0) {
        await handleBulkInventoryUpdates(changedOrderIds, status, previousStatusByOrderId);

        // Same reasoning as the single-order update paths: cancelling (or
        // returning) deactivates any still-active shipment, since the
        // courier picker locks once cancelled/delivered/returned and
        // there's no other way to trigger this afterward.
        if (status === "cancelled" || status === "returned") {
          const { error: shipmentError } = await supabaseAdmin
            .from("courier_tracking")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in("order_id", changedOrderIds)
            .eq("is_active", true);

          if (shipmentError) {
            console.error("Error deactivating shipments in bulk cancel/return:", shipmentError);
          }
        }

        // Returned-specific side effects — auto-refund, risk scoring, and
        // the customer dues ledger reversal. Per-order, since only the
        // subset that was actually PAID before needs any of this.
        if (status === "returned") {
          const paidOrderIds = changedOrderIds.filter(
            (id) => previousOrderInfoById[id]?.payment_status === PaymentStatus.PAID
          );

          // Auto-flip to refunded — same rule as the single-order paths:
          // only when the admin didn't already explicitly choose a payment
          // status for this same bulk action.
          if (paidOrderIds.length > 0 && payment_status === undefined) {
            const { error: refundStatusError } = await supabaseAdmin
              .from("orders")
              .update({ payment_status: PaymentStatus.REFUNDED, updated_at: new Date().toISOString() })
              .in("id", paidOrderIds);

            if (refundStatusError) {
              console.error("Error auto-flipping bulk-returned orders to refunded:", refundStatusError);
            }
          }

          await Promise.all(
            changedOrderIds.map(async (id) => {
              const info = previousOrderInfoById[id];
              if (!info) return;

              await recordOrderOutcome(info.phone, storeId, "returned");

              if (info.payment_status === PaymentStatus.PAID) {
                await handleOrderReturned({
                  storeId,
                  orderId: id,
                  customerId: info.customer_id,
                  wasPaid: true,
                });
              }
            })
          );
        }
      }
    }

    await Promise.all(
      changesByOrder.map(({ order, change }) =>
        logOrderChange(storeResult.actor, order, {
          ...change,
          fields: [
            delivery_option && "delivery",
            payment_method && "payment method",
            notes && "notes",
          ].filter((f): f is string => !!f),
        }),
      ),
    );

    return {
      success: true,
      updatedCount,
      message: `Successfully updated ${updatedCount} orders`,
    };
  } catch (error: unknown) {
    console.error("Error in bulkUpdateOrders:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error occurred during bulk update";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Handle inventory updates for bulk status changes
async function handleBulkInventoryUpdates(
  orderIds: string[],
  newStatus: OrderStatus,
  previousStatusByOrderId: Record<string, string>
): Promise<void> {
  try {
    if (newStatus !== "cancelled" && newStatus !== "delivered" && newStatus !== "returned") {
      return; // Only handle inventory for cancelled, delivered, or returned status
    }

    // Get all order items for the affected orders
    const { data: orderItems, error } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (error || !orderItems || orderItems.length === 0) {
      return;
    }


    if (newStatus === "cancelled") {
      await returnBulkReservedStockToAvailable(orderItems);
    } else if (newStatus === "delivered") {
      await deductBulkReservedStock(orderItems);
    } else if (newStatus === "returned") {
      // Once delivered, quantity_reserved is already zeroed (deductBulkReservedStock
      // never touches quantity_available) — those items restock straight to
      // available. Items coming from any earlier status are still sitting in
      // quantity_reserved, same case cancelled already handles.
      const fromDelivered = orderItems.filter(
        (item) => previousStatusByOrderId[item.order_id] === "delivered"
      );
      const fromOther = orderItems.filter(
        (item) => previousStatusByOrderId[item.order_id] !== "delivered"
      );
      if (fromDelivered.length > 0) await restockBulkDeliveredReturn(fromDelivered);
      if (fromOther.length > 0) await returnBulkReservedStockToAvailable(fromOther);
    }
  } catch (error) {
    console.error("Error in handleBulkInventoryUpdates:", error);
    // Don't throw error as order updates were successful
  }
}

// Return reserved stock to available for multiple orders when cancelled
async function returnBulkReservedStockToAvailable(
  orderItems: OrderItem[]
): Promise<void> {
  await moveBulkStock(orderItems, "release");
}

// Add stock straight back to available for multiple DELIVERED orders that
// are being returned — see handleBulkInventoryUpdates for why this is a
// separate path from returnBulkReservedStockToAvailable.
async function restockBulkDeliveredReturn(orderItems: OrderItem[]): Promise<void> {
  await moveBulkStock(orderItems, "restock");
}

// Deduct reserved stock for multiple orders when delivered
async function deductBulkReservedStock(orderItems: OrderItem[]): Promise<void> {
  await moveBulkStock(orderItems, "finalize");
}

// Each order's stock moves in its own branch, row-locked in the database
// (order_stock_move) — see orderStock.ts. Bundle header lines are skipped
// there, since a bundle holds no stock of its own.
async function moveBulkStock(
  orderItems: OrderItem[],
  op: "release" | "restock" | "finalize",
): Promise<void> {
  const byOrder = new Map<string, OrderItem[]>();
  for (const item of orderItems) {
    byOrder.set(item.order_id, [...(byOrder.get(item.order_id) ?? []), item]);
  }
  await Promise.all(
    Array.from(byOrder.entries()).map(([orderId, items]) => moveOrderStock(orderId, items, op)),
  );
}
