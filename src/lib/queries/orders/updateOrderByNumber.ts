"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums

export interface UpdateOrderByNumberData {
  orderId: string;
  storeId: string;
  orderNumber?: string;
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
    country?: string;
  };
  orderProducts: any[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  additionalCharges: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus; // ✅ Using enum
  paymentStatus: PaymentStatus; // ✅ Using enum
  paymentMethod: string;
  deliveryOption: string;
  courier?: string;
  currency?: string;
  shippingAddress?: {
    customer_name: string;
    phone: string;
    email?: string;
    address_line_1: string;
    address?: string;
    city: string;
    postal_code?: string;
    country: string;
    deliveryOption?: string;
    deliveryMethod?: string;
  };
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

    const {
      orderId,
      storeId,
      customerInfo,
      orderProducts,
      subtotal,
      taxAmount,
      discount,
      additionalCharges,
      deliveryCost,
      totalAmount,
      status,
      paymentStatus,
      paymentMethod,
      deliveryOption,
      courier,
      currency = "BDT",
      shippingAddress,
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
    const { data: existingOrderItemsRaw, error: itemsFetchError } =
      await supabaseAdmin
        .from("order_items")
        .select("*, products(product_type)")
        .eq("order_id", orderId);

    if (itemsFetchError) {
      console.error("Error fetching existing order items:", itemsFetchError);
      return {
        success: false,
        error: `Failed to fetch order items: ${itemsFetchError.message}`,
      };
    }

    // Bundle header rows aren't editable through this generic line-item
    // diff (see plan: bundle recipes can't be changed after order creation)
    // — hide them from both sides of the comparison so they're never
    // duplicated, deleted, or mistaken for a plain product needing
    // inventory. Their component rows (ordinary products) are untouched
    // and keep flowing through normally.
    const existingOrderItems = (existingOrderItemsRaw ?? []).filter(
      (item: any) => item.products?.product_type !== "bundle"
    );

    const { data: newItemProducts } = orderProducts.length
      ? await supabaseAdmin
          .from("products")
          .select("id, product_type")
          .in(
            "id",
            [...new Set(orderProducts.map((item: any) => item.product_id))]
          )
      : { data: [] as { id: string; product_type: string }[] };
    const bundleProductIds = new Set(
      (newItemProducts ?? [])
        .filter((p) => p.product_type === "bundle")
        .map((p) => p.id)
    );
    const nonBundleOrderProducts = orderProducts.filter(
      (item: any) => !bundleProductIds.has(item.product_id)
    );

    // ✅ FIXED: Create complete shipping address object
    const shippingAddressUpdate = shippingAddress || {
      customer_name: customerInfo.name || "",
      phone: customerInfo.phone || "",
      email: customerInfo.email || "",
      address_line_1: customerInfo.address || "",
      address: customerInfo.address || "", // For backward compatibility
      city: customerInfo.city || "",
      postal_code: customerInfo.postal_code || "",
      country: customerInfo.country || "Bangladesh",
      deliveryOption: customerInfo.deliveryOption || "",
      deliveryMethod: customerInfo.deliveryMethod || "",
    };


    // Switching the Delivery Courier deactivates (never deletes) the
    // previous courier's courier_tracking row — see updateOrder.ts for the
    // same logic on the inline-editor save path. Cancelling the order does
    // the same thing even if the courier field itself isn't touched —
    // otherwise the shipment sits "active" forever once cancelled/delivered
    // locks the courier picker and there's no other way to trigger this.
    const courierChanged = courier !== undefined && (courier || null) !== (existingOrder.courier || null);
    const justCancelled = status !== existingOrder.status && status === OrderStatus.CANCELLED;

    // Update the order with COMPLETE shipping address
    const updateOrderData = {
      status,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      additional_charges: additionalCharges,
      shipping_fee: deliveryCost,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      delivery_option: deliveryOption,
      courier: courier || null,
      customer_id: customerInfo.customer_id || null,
      shipping_address: shippingAddressUpdate,
      billing_address: shippingAddressUpdate,
      notes: customerInfo.notes,
      updated_at: new Date().toISOString(),
    };

    

    // Update order with customer link
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateOrderData)
      .eq("id", orderId)
      .eq("store_id", storeId)
      .select(
        `
        *,
        store_customers:customer_id (
          id,
          name,
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

    // Keep the customer's own record in sync with whatever name/phone/email
    // was just saved on this order — otherwise a corrected typo only ever
    // shows up on this one order while the customer list, their other
    // orders, etc. keep showing the old (wrong) value forever. Address/city
    // deliberately stay order-only: a single delivery can legitimately go
    // somewhere other than the customer's saved default address, and that
    // shouldn't overwrite their profile. Never fails the order update itself.
    if (customerInfo.customer_id) {
      const { error: customerSyncError } = await supabaseAdmin
        .from("store_customers")
        .update({
          name: customerInfo.name || undefined,
          phone: customerInfo.phone || undefined,
          email: customerInfo.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerInfo.customer_id);

      if (customerSyncError) {
        console.error("Error syncing customer record:", customerSyncError);
      }
    }

    if (courierChanged || justCancelled) {
      await supabaseAdmin
        .from("courier_tracking")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .eq("is_active", true);
    }

    // Update order items intelligently
    await updateOrderItems(orderId, existingOrderItems, nonBundleOrderProducts);

    // Handle inventory updates based on status and quantity changes
    await handleInventoryUpdates(
      existingOrder,
      updateData,
      existingOrderItems,
      nonBundleOrderProducts
    );


    // Fetch updated order with items
    const { data: finalOrder } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (*),
        store_customers:customer_id (
          id,
          name,
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
        // Insert new item. The edit form already carries cost_price from the
        // product/variant's tp_price at the moment it was added to the
        // order — fall back to a fresh lookup only if that's missing.
        let costPrice = newItem.cost_price ?? null;
        if (costPrice == null) {
          costPrice = newItem.variant_id
            ? (
                await supabaseAdmin
                  .from("product_variants")
                  .select("tp_price")
                  .eq("id", newItem.variant_id)
                  .maybeSingle()
              ).data?.tp_price ?? null
            : (
                await supabaseAdmin
                  .from("products")
                  .select("tp_price")
                  .eq("id", newItem.product_id)
                  .maybeSingle()
              ).data?.tp_price ?? null;
        }

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
            cost_price: costPrice,
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


    // Handle items that were REMOVED from the order
    for (const [key, existingItem] of existingItemsMap) {
      if (!newItemsMap.has(key)) {
       
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
      

        if (quantityDiff !== 0) {
          await adjustInventory(existingItem, quantityDiff);
        }
      } else {
        // This is a NEW item added to the order
        await adjustInventory(newItem, newItem.quantity);
      }
    }

    // Handle status changes
    if (updateData.status !== existingOrder.status) {
     
      await handleStatusChangeInventory(
        existingOrder.status,
        updateData.status,
        newItems
      );
    }

  } catch (error) {
    console.error("❌ Error in handleInventoryUpdates:", error);
    // Don't throw error here as order update was successful
  }
}

// Adjust inventory based on quantity changes
async function adjustInventory(item: any, quantityDiff: number): Promise<void> {
  try {
    if (quantityDiff === 0) {
      return;
    }

    

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
        
      }
    }
  } catch (error) {
    console.error(`❌ Error adjusting inventory for item ${item.id}:`, error);
  }
}

// Handle inventory updates based on status changes
async function handleStatusChangeInventory(
  oldStatus: string,
  newStatus: OrderStatus, // ✅ Using enum
  orderItems: any[]
): Promise<void> {
  try {

    // Any non-cancelled status (pending, confirmed, shipped, or even delivered —
    // a delivered-then-returned order) moving to cancelled returns stock.
    // returnReservedStockToAvailable clamps quantity_reserved at 0, so it's
    // safe to call regardless of which status this came from.
    if (
      oldStatus !== OrderStatus.CANCELLED &&
      newStatus === OrderStatus.CANCELLED
    ) {
      await returnReservedStockToAvailable(orderItems);
    }

    // From cancelled to pending/confirmed - reserve stock again
    if (
      oldStatus === OrderStatus.CANCELLED &&
      (newStatus === OrderStatus.PENDING || newStatus === OrderStatus.CONFIRMED)
    ) {
      await reserveStock(orderItems);
    }

    // From any status to delivered - deduct reserved stock (finalize)
    if (newStatus === OrderStatus.DELIVERED) {
      await deductReservedStock(orderItems);
    }

    // From delivered back to confirmed/pending - reverse the deduction
    if (
      oldStatus === OrderStatus.DELIVERED &&
      (newStatus === OrderStatus.PENDING || newStatus === OrderStatus.CONFIRMED)
    ) {
      await reserveStock(orderItems);
    }

    
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