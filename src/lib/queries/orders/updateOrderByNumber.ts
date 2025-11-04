/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase";

export interface UpdateOrderByNumberData {
  orderId: string;
  storeId: string;
  customerInfo: {
    name: string;
    phone: string;
    address: string;
    deliveryMethod: string;
    deliveryOption: string;
    city: string;
    email: string;
    notes: string;
    postal_code: string;
    customer_id?: string;
  };
  orderProducts: any[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  deliveryCost: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "shipped";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  deliveryOption: string;
}

export interface UpdateOrderByNumberResult {
  success: boolean;
  error?: string;
  updatedOrder?: any;
}

export async function updateOrderByNumber(
  updateData: UpdateOrderByNumberData
): Promise<UpdateOrderByNumberResult> {
  try {
    console.log("Updating order with data:", updateData);

    const {
      orderId,
      storeId,
      customerInfo,
      orderProducts,
      subtotal,
      taxAmount,
      discount,
      deliveryCost,
      totalAmount,
      status,
      paymentStatus,
      paymentMethod,
      deliveryOption,
    } = updateData;

    // Validate order exists and belongs to store
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .single();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
      return {
        success: false,
        error: `Order not found: ${fetchError.message}`,
      };
    }

    // Get existing order items to compare
    const { data: existingOrderItems, error: itemsFetchError } =
      await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

    if (itemsFetchError) {
      console.error("Error fetching existing order items:", itemsFetchError);
      return {
        success: false,
        error: `Failed to fetch order items: ${itemsFetchError.message}`,
      };
    }

    // Update the order
    const updateOrderData = {
      status,
      subtotal,
      tax_amount: taxAmount,
      shipping_fee: deliveryCost,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      delivery_option: deliveryOption,
      shipping_address: {
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        city: customerInfo.city,
        postal_code: customerInfo.postal_code,
        deliveryOption: customerInfo.deliveryOption,
        deliveryMethod: customerInfo.deliveryMethod,
      },
      notes: customerInfo.notes,
      updated_at: new Date().toISOString(),
    };

    console.log("Updating order with:", updateOrderData);

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateOrderData)
      .eq("id", orderId)
      .eq("store_id", storeId)
      .select(
        `
        *,
        customers:customer_id (
          id,
          first_name,
          email,
          phone
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating order:", updateError);
      return {
        success: false,
        error: `Failed to update order: ${updateError.message}`,
      };
    }

    // Update order items intelligently
    await updateOrderItems(orderId, existingOrderItems || [], orderProducts);

    // Handle inventory updates based on status and quantity changes
    await handleInventoryUpdates(
      existingOrder,
      updateData,
      existingOrderItems || [],
      orderProducts
    );

    console.log("Order updated successfully");

    // Fetch updated order with items
    const { data: finalOrder } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (*),
        customers:customer_id (
          id,
          first_name,
          email,
          phone
        )
      `
      )
      .eq("id", orderId)
      .single();

    return {
      success: true,
      updatedOrder: finalOrder,
    };
  } catch (error: any) {
    console.error("Error in updateOrderByNumber:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred while updating order",
    };
  }
}

// Update order items intelligently (update existing, add new, remove deleted)
async function updateOrderItems(
  orderId: string,
  existingItems: any[],
  newItems: any[]
): Promise<void> {
  try {
    const existingItemsMap = new Map();
    existingItems.forEach((item) => {
      const key = `${item.product_id}-${item.variant_id || "no-variant"}`;
      existingItemsMap.set(key, item);
    });

    const newItemsMap = new Map();
    newItems.forEach((item) => {
      const key = `${item.product_id}-${item.variant_id || "no-variant"}`;
      newItemsMap.set(key, item);
    });

    // Update existing items or insert new ones
    for (const [key, newItem] of newItemsMap) {
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        // Update existing item
        const { error: updateError } = await supabaseAdmin
          .from("order_items")
          .update({
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            total_price: newItem.total_price,
            product_name: newItem.product_name,
            variant_details: newItem.variant_details || null,
          })
          .eq("id", existingItem.id);

        if (updateError) {
          console.error(
            `Error updating order item ${existingItem.id}:`,
            updateError
          );
        }

        // Remove from existing map to track what's left
        existingItemsMap.delete(key);
      } else {
        // Insert new item
        const { error: insertError } = await supabaseAdmin
          .from("order_items")
          .insert({
            order_id: orderId,
            product_id: newItem.product_id,
            variant_id: newItem.variant_id || null,
            product_name: newItem.product_name,
            variant_details: newItem.variant_details || null,
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            total_price: newItem.total_price,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error inserting new order item:`, insertError);
        }
      }
    }

    // Remove items that are no longer in the order
    for (const [key, existingItem] of existingItemsMap) {
      const { error: deleteError } = await supabaseAdmin
        .from("order_items")
        .delete()
        .eq("id", existingItem.id);

      if (deleteError) {
        console.error(
          `Error deleting order item ${existingItem.id}:`,
          deleteError
        );
      }
    }
  } catch (error) {
    console.error("Error in updateOrderItems:", error);
    throw error;
  }
}

// Handle inventory updates based on status and quantity changes
async function handleInventoryUpdates(
  existingOrder: any,
  updateData: UpdateOrderByNumberData,
  existingItems: any[],
  newItems: any[]
): Promise<void> {
  try {
    console.log("🔄 Starting inventory updates...");
    console.log("Existing items:", existingItems);
    console.log("New items:", newItems);
    console.log(
      "Old status:",
      existingOrder.status,
      "New status:",
      updateData.status
    );

    // Create maps for comparison
    const existingItemsMap = new Map();
    existingItems.forEach((item) => {
      const key = `${item.product_id}-${item.variant_id || "no-variant"}`;
      existingItemsMap.set(key, item);
    });

    const newItemsMap = new Map();
    newItems.forEach((item) => {
      const key = `${item.product_id}-${item.variant_id || "no-variant"}`;
      newItemsMap.set(key, item);
    });

    console.log("Existing items map:", Array.from(existingItemsMap.keys()));
    console.log("New items map:", Array.from(newItemsMap.keys()));

    // Handle items that were REMOVED from the order
    for (const [key, existingItem] of existingItemsMap) {
      if (!newItemsMap.has(key)) {
        console.log(
          `❌ Item removed: ${key}, quantity: ${existingItem.quantity}`
        );
        // Item was removed - return the reserved quantity to available
        await adjustInventory(existingItem, -existingItem.quantity);
      }
    }

    // Handle items that are in the NEW order (both existing and new items)
    for (const [key, newItem] of newItemsMap) {
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        // Item exists in both - check for quantity changes
        const quantityDiff = newItem.quantity - existingItem.quantity;
        console.log(
          `📊 Quantity change for ${key}: ${existingItem.quantity} -> ${newItem.quantity} (diff: ${quantityDiff})`
        );

        if (quantityDiff !== 0) {
          await adjustInventory(existingItem, quantityDiff);
        }
      } else {
        // This is a NEW item added to the order
        console.log(`➕ New item added: ${key}, quantity: ${newItem.quantity}`);
        await adjustInventory(newItem, newItem.quantity);
      }
    }

    // Handle status changes
    if (updateData.status !== existingOrder.status) {
      console.log(
        `🔄 Status change: ${existingOrder.status} -> ${updateData.status}`
      );
      await handleStatusChangeInventory(
        existingOrder.status,
        updateData.status,
        newItems
      );
    }

    console.log("✅ Inventory updates completed");
  } catch (error) {
    console.error("❌ Error in handleInventoryUpdates:", error);
    // Don't throw error here as order update was successful
  }
}

// Adjust inventory based on quantity changes
async function adjustInventory(item: any, quantityDiff: number): Promise<void> {
  try {
    if (quantityDiff === 0) {
      console.log(`➖ No quantity change for item ${item.product_id}`);
      return;
    }

    console.log(
      `📦 Adjusting inventory for ${item.product_name}: ${
        quantityDiff > 0 ? "+" : ""
      }${quantityDiff}`
    );

    const inventoryQuery = item.variant_id
      ? supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single()
      : supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .single();

    const { data: inventory, error: inventoryError } = await inventoryQuery;

    if (inventoryError) {
      console.error(`❌ Inventory not found for item:`, item, inventoryError);
      return;
    }

    if (inventory) {
      const currentAvailable = inventory.quantity_available || 0;
      const currentReserved = inventory.quantity_reserved || 0;

      const newAvailable = Math.max(0, currentAvailable - quantityDiff);
      const newReserved = Math.max(0, currentReserved + quantityDiff);

      console.log(
        `📊 Inventory update - Available: ${currentAvailable} -> ${newAvailable}, Reserved: ${currentReserved} -> ${newReserved}`
      );

      const updateQuery = item.variant_id
        ? supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq("variant_id", item.variant_id)
        : supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq("product_id", item.product_id)
            .is("variant_id", null);

      const { error: updateError } = await updateQuery;

      if (updateError) {
        console.error(`❌ Error updating inventory:`, updateError);
      } else {
        console.log(
          `✅ Inventory updated successfully for ${item.product_name}`
        );
      }
    }
  } catch (error) {
    console.error(`❌ Error adjusting inventory for item ${item.id}:`, error);
  }
}

// Handle inventory updates based on status changes
async function handleStatusChangeInventory(
  oldStatus: string,
  newStatus: string,
  orderItems: any[]
): Promise<void> {
  try {
    console.log(`🔄 Processing status change: ${oldStatus} -> ${newStatus}`);

    // From pending/confirmed to cancelled - return stock
    if (
      (oldStatus === "pending" || oldStatus === "confirmed") &&
      newStatus === "cancelled"
    ) {
      console.log("🔄 Returning reserved stock to available");
      await returnReservedStockToAvailable(orderItems);
    }

    // From cancelled to pending/confirmed - reserve stock again
    if (
      oldStatus === "cancelled" &&
      (newStatus === "pending" || newStatus === "confirmed")
    ) {
      console.log("🔄 Reserving stock again");
      await reserveStock(orderItems);
    }

    // From any status to completed - deduct reserved stock (finalize)
    if (newStatus === "completed") {
      console.log("🔄 Deducting reserved stock (order completed)");
      await deductReservedStock(orderItems);
    }

    // From completed back to confirmed/pending - reverse the deduction
    if (
      oldStatus === "completed" &&
      (newStatus === "pending" || newStatus === "confirmed")
    ) {
      console.log("🔄 Reversing completed order - reserving stock again");
      await reserveStock(orderItems);
    }

    console.log(
      `✅ Status change processing completed: ${oldStatus} -> ${newStatus}`
    );
  } catch (error) {
    console.error("❌ Error in handleStatusChangeInventory:", error);
  }
}

// Reserve stock when order is confirmed
async function reserveStock(orderItems: any[]): Promise<void> {
  for (const item of orderItems) {
    try {
      if (item.variant_id) {
        const { data: inventory } = await supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single();

        if (inventory) {
          const newAvailable = Math.max(
            0,
            (inventory.quantity_available || 0) - item.quantity
          );
          const newReserved =
            (inventory.quantity_reserved || 0) + item.quantity;

          await supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq("variant_id", item.variant_id);
        }
      } else {
        const { data: inventory } = await supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .single();

        if (inventory) {
          const newAvailable = Math.max(
            0,
            (inventory.quantity_available || 0) - item.quantity
          );
          const newReserved =
            (inventory.quantity_reserved || 0) + item.quantity;

          await supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq("product_id", item.product_id)
            .is("variant_id", null);
        }
      }
    } catch (error) {
      console.error(`Error reserving stock for item ${item.id}:`, error);
    }
  }
}

// Return reserved stock to available when order is cancelled
async function returnReservedStockToAvailable(
  orderItems: any[]
): Promise<void> {
  for (const item of orderItems) {
    try {
      if (item.variant_id) {
        const { data: inventory } = await supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single();

        if (inventory) {
          const newAvailable =
            (inventory.quantity_available || 0) + item.quantity;
          const newReserved = Math.max(
            0,
            (inventory.quantity_reserved || 0) - item.quantity
          );

          await supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq("variant_id", item.variant_id);
        }
      } else {
        const { data: inventory } = await supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .single();

        if (inventory) {
          const newAvailable =
            (inventory.quantity_available || 0) + item.quantity;
          const newReserved = Math.max(
            0,
            (inventory.quantity_reserved || 0) - item.quantity
          );

          await supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq("product_id", item.product_id)
            .is("variant_id", null);
        }
      }
    } catch (error) {
      console.error(`Error returning stock for item ${item.id}:`, error);
    }
  }
}

// Deduct reserved stock when order is delivered
async function deductReservedStock(orderItems: any[]): Promise<void> {
  for (const item of orderItems) {
    try {
      if (item.variant_id) {
        const { data: inventory } = await supabaseAdmin
          .from("product_inventory")
          .select("quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single();

        if (inventory) {
          const newReserved = Math.max(
            0,
            (inventory.quantity_reserved || 0) - item.quantity
          );

          await supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_reserved: newReserved,
            })
            .eq("variant_id", item.variant_id);
        }
      } else {
        const { data: inventory } = await supabaseAdmin
          .from("product_inventory")
          .select("quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .single();

        if (inventory) {
          const newReserved = Math.max(
            0,
            (inventory.quantity_reserved || 0) - item.quantity
          );

          await supabaseAdmin
            .from("product_inventory")
            .update({
              quantity_reserved: newReserved,
            })
            .eq("product_id", item.product_id)
            .is("variant_id", null);
        }
      }
    } catch (error) {
      console.error(`Error deducting stock for item ${item.id}:`, error);
    }
  }
}
