// lib/queries/orders/bulkUpdateOrders.ts
import { supabaseAdmin } from "@/lib/supabase";
import {
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
} from "@/lib/types/enums";

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
    console.log("Bulk updating orders:", {
      orderCount: updateData.orderIds.length,
      updates: updateData,
    });

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

    // Prepare update data with proper typing
    const updatePayload: UpdatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (payment_status) updatePayload.payment_status = payment_status;
    if (delivery_option) updatePayload.delivery_option = delivery_option;
    if (payment_method) updatePayload.payment_method = payment_method;
    if (notes) updatePayload.notes = notes;

    console.log("Bulk update payload:", updatePayload);

    // Perform bulk update
    const {
      data: updatedOrders,
      error: updateError,
      count,
    } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .in("id", updateData.orderIds)
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

    console.log(`Bulk update successful. Updated ${updatedCount} orders`);

    // Handle inventory updates for status changes if needed
    if (status) {
      await handleBulkInventoryUpdates(updateData.orderIds, status);
    }

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
  newStatus: OrderStatus
): Promise<void> {
  try {
    if (newStatus !== "cancelled" && newStatus !== "delivered") {
      return; // Only handle inventory for cancelled or delivered status
    }

    // Get all order items for the affected orders
    const { data: orderItems, error } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (error || !orderItems || orderItems.length === 0) {
      console.log("No order items found for inventory update");
      return;
    }

    console.log(`Processing inventory updates for ${orderItems.length} items`);

    if (newStatus === "cancelled") {
      await returnBulkReservedStockToAvailable(orderItems);
    } else if (newStatus === "delivered") {
      await deductBulkReservedStock(orderItems);
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
  const inventoryUpdates: Record<string, InventoryUpdate> = {};

  // Group inventory updates by product/variant
  for (const item of orderItems) {
    const key = item.variant_id
      ? `variant_${item.variant_id}`
      : `product_${item.product_id}`;

    if (!inventoryUpdates[key]) {
      inventoryUpdates[key] = { available: 0, reserved: 0 };
    }

    inventoryUpdates[key].available += item.quantity;
    inventoryUpdates[key].reserved -= item.quantity;
  }

  // Process all inventory updates
  const updatePromises = Object.entries(inventoryUpdates).map(
    async ([key, update]) => {
      try {
        if (key.startsWith("variant_")) {
          const variantId = key.replace("variant_", "");

          const { data: inventory } = await supabaseAdmin
            .from("product_inventory")
            .select("quantity_available, quantity_reserved")
            .eq("variant_id", variantId)
            .single();

          if (inventory) {
            const newAvailable =
              (inventory.quantity_available || 0) + update.available;
            const newReserved = Math.max(
              0,
              (inventory.quantity_reserved || 0) + update.reserved
            );

            await supabaseAdmin
              .from("product_inventory")
              .update({
                quantity_available: newAvailable,
                quantity_reserved: newReserved,
                updated_at: new Date().toISOString(),
              })
              .eq("variant_id", variantId);
          }
        } else {
          const productId = key.replace("product_", "");

          const { data: inventory } = await supabaseAdmin
            .from("product_inventory")
            .select("quantity_available, quantity_reserved")
            .eq("product_id", productId)
            .is("variant_id", null)
            .single();

          if (inventory) {
            const newAvailable =
              (inventory.quantity_available || 0) + update.available;
            const newReserved = Math.max(
              0,
              (inventory.quantity_reserved || 0) + update.reserved
            );

            await supabaseAdmin
              .from("product_inventory")
              .update({
                quantity_available: newAvailable,
                quantity_reserved: newReserved,
                updated_at: new Date().toISOString(),
              })
              .eq("product_id", productId)
              .is("variant_id", null);
          }
        }
      } catch (error) {
        console.error(`Error updating inventory for ${key}:`, error);
      }
    }
  );

  await Promise.all(updatePromises);
}

// Deduct reserved stock for multiple orders when delivered
async function deductBulkReservedStock(orderItems: OrderItem[]): Promise<void> {
  const reservedDeductions: Record<string, number> = {};

  // Group reserved quantity deductions by product/variant
  for (const item of orderItems) {
    const key = item.variant_id
      ? `variant_${item.variant_id}`
      : `product_${item.product_id}`;
    reservedDeductions[key] = (reservedDeductions[key] || 0) + item.quantity;
  }

  // Process all reserved quantity deductions
  const updatePromises = Object.entries(reservedDeductions).map(
    async ([key, deduction]) => {
      try {
        if (key.startsWith("variant_")) {
          const variantId = key.replace("variant_", "");

          const { data: inventory } = await supabaseAdmin
            .from("product_inventory")
            .select("quantity_reserved")
            .eq("variant_id", variantId)
            .single();

          if (inventory) {
            const newReserved = Math.max(
              0,
              (inventory.quantity_reserved || 0) - deduction
            );

            await supabaseAdmin
              .from("product_inventory")
              .update({
                quantity_reserved: newReserved,
                updated_at: new Date().toISOString(),
              })
              .eq("variant_id", variantId);
          }
        } else {
          const productId = key.replace("product_", "");

          const { data: inventory } = await supabaseAdmin
            .from("product_inventory")
            .select("quantity_reserved")
            .eq("product_id", productId)
            .is("variant_id", null)
            .single();

          if (inventory) {
            const newReserved = Math.max(
              0,
              (inventory.quantity_reserved || 0) - deduction
            );

            await supabaseAdmin
              .from("product_inventory")
              .update({
                quantity_reserved: newReserved,
                updated_at: new Date().toISOString(),
              })
              .eq("product_id", productId)
              .is("variant_id", null);
          }
        }
      } catch (error) {
        console.error(`Error deducting reserved stock for ${key}:`, error);
      }
    }
  );

  await Promise.all(updatePromises);
}
