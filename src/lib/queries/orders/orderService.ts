/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase";
import { OrderProduct, CustomerInfo } from "../../types/order";

export interface CreateOrderData {
  storeId: string;
  orderNumber: string;
  customerInfo: CustomerInfo;
  orderProducts: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  deliveryCost: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  currency?: string;
  deliveryOption: string; // ✅ add this
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

// Helper function to validate stock availability
async function validateStockAvailability(
  orderProducts: OrderProduct[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const item of orderProducts) {
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

      const { data: inventory, error } = await inventoryQuery;

      if (error) {
        // If inventory record doesn't exist, treat as out of stock
        return {
          success: false,
          error: `Product "${item.product_name}" is out of stock or inventory record missing`,
        };
      }

      // Available stock is simply quantity_available
      const availableStock = inventory.quantity_available || 0;

      if (availableStock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${item.product_name}". Available: ${availableStock}, Requested: ${item.quantity}`,
        };
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to update inventory (reserve or release stock)
async function updateInventoryForOrder(
  orderProducts: OrderProduct[],
  action: "reserve" | "release"
): Promise<{ success: boolean; error?: string }> {
  const inventoryUpdateResults = [];

  for (const item of orderProducts) {
    try {
      console.log(
        `Updating inventory for product ${item.product_id}, variant ${item.variant_id}, quantity ${item.quantity}, action: ${action}`
      );

      // Determine the query based on whether it's a variant or base product
      const inventoryQuery = item.variant_id
        ? supabaseAdmin
            .from("product_inventory")
            .select("id, quantity_available, quantity_reserved")
            .eq("variant_id", item.variant_id)
            .single()
        : supabaseAdmin
            .from("product_inventory")
            .select("id, quantity_available, quantity_reserved")
            .eq("product_id", item.product_id)
            .is("variant_id", null)
            .single();

      const { data: inventoryData, error: fetchError } = await inventoryQuery;

      if (fetchError) {
        console.error(
          `Error fetching inventory for ${
            item.variant_id ? "variant" : "product"
          } ${item.variant_id || item.product_id}:`,
          fetchError
        );
        inventoryUpdateResults.push({
          type: item.variant_id ? "variant" : "product",
          id: item.variant_id || item.product_id,
          success: false,
          error: `Failed to fetch inventory: ${fetchError.message}`,
        });
        continue;
      }

      // Calculate new quantities based on action
      const updateData: any = {};
      const currentAvailable = inventoryData.quantity_available || 0;
      const currentReserved = inventoryData.quantity_reserved || 0;

      if (action === "reserve") {
        // When reserving: decrease available quantity AND increase reserved quantity
        const newAvailable = Math.max(0, currentAvailable - item.quantity);
        const newReserved = currentReserved + item.quantity;

        updateData.quantity_available = newAvailable;
        updateData.quantity_reserved = newReserved;

        console.log(
          `Reserving stock: Available ${currentAvailable} → ${newAvailable}, Reserved ${currentReserved} → ${newReserved}`
        );
      } else {
        // When releasing: increase available quantity AND decrease reserved quantity
        const newAvailable = currentAvailable + item.quantity;
        const newReserved = Math.max(0, currentReserved - item.quantity);

        updateData.quantity_available = newAvailable;
        updateData.quantity_reserved = newReserved;

        console.log(
          `Releasing stock: Available ${currentAvailable} → ${newAvailable}, Reserved ${currentReserved} → ${newReserved}`
        );
      }

      updateData.updated_at = new Date().toISOString();

      // Determine the update query
      const updateQuery = item.variant_id
        ? supabaseAdmin
            .from("product_inventory")
            .update(updateData)
            .eq("variant_id", item.variant_id)
        : supabaseAdmin
            .from("product_inventory")
            .update(updateData)
            .eq("product_id", item.product_id)
            .is("variant_id", null);

      const { error: updateError } = await updateQuery;

      if (updateError) {
        console.error(
          `Error updating inventory for ${
            item.variant_id ? "variant" : "product"
          } ${item.variant_id || item.product_id}:`,
          updateError
        );
        inventoryUpdateResults.push({
          type: item.variant_id ? "variant" : "product",
          id: item.variant_id || item.product_id,
          success: false,
          error: updateError.message,
        });
      } else {
        console.log(
          `Successfully updated ${
            item.variant_id ? "variant" : "product"
          } inventory`
        );
        inventoryUpdateResults.push({
          type: item.variant_id ? "variant" : "product",
          id: item.variant_id || item.product_id,
          success: true,
        });
      }
    } catch (inventoryError: any) {
      console.error(
        `Unexpected inventory update error for item:`,
        item,
        inventoryError
      );
      inventoryUpdateResults.push({
        type: item.variant_id ? "variant" : "product",
        id: item.variant_id || item.product_id,
        success: false,
        error: inventoryError.message,
      });
    }
  }

  // Check results
  const successfulUpdates = inventoryUpdateResults.filter(
    (result) => result.success
  );
  const failedUpdates = inventoryUpdateResults.filter(
    (result) => !result.success
  );

  console.log(
    `Inventory updates: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`
  );

  if (failedUpdates.length > 0) {
    const errorMessage = `Failed to update inventory for ${failedUpdates.length} items`;
    console.warn(errorMessage, failedUpdates);
    return { success: false, error: errorMessage };
  }

  return { success: true };
}

export async function createOrder(
  orderData: CreateOrderData
): Promise<CreateOrderResult> {
  try {
    const {
      storeId,
      orderNumber,
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
      currency = "BDT",
    } = orderData;

    // Validate required fields
    if (!storeId) {
      throw new Error("Store ID is required");
    }

    if (!orderNumber) {
      throw new Error("Order number is required");
    }

    if (!customerInfo.name || !customerInfo.phone) {
      throw new Error("Customer name and phone are required");
    }

    if (orderProducts.length === 0) {
      throw new Error("At least one product is required");
    }

    // Step 0: Validate stock availability before creating order
    console.log("Validating stock availability...");
    const stockValidation = await validateStockAvailability(orderProducts);
    if (!stockValidation.success) {
      throw new Error(`Insufficient stock: ${stockValidation.error}`);
    }

    console.log("Stock validation passed - sufficient stock available");

    // Prepare shipping address JSON
    const shippingAddress = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      address_line_1: customerInfo.address,
      city: customerInfo.city,
      country: "Bangladesh",
    };

    console.log("Creating order with data:", {
      orderNumber,
      storeId,
      customerId: customerInfo.customer_id,
      orderProductsCount: orderProducts.length,
      subtotal,
      totalAmount,
    });

    // Step 1: Create the order
    const orderInsertData = {
      order_number: orderNumber,
      store_id: storeId,
      customer_id: customerInfo.customer_id || null,
      status: status,
      subtotal: subtotal,
      tax_amount: taxAmount,
      shipping_fee: deliveryCost,
      total_amount: totalAmount,
      currency: currency,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      notes: customerInfo.notes,
      delivery_option: orderData.deliveryOption, // ✅ add this line
    };

    console.log("Order insert data:", orderInsertData);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([orderInsertData])
      .select("id, order_number, customer_id")
      .single();

    if (orderError) {
      console.error("Order insertion error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("Order created successfully:", order);

    // Step 2: Insert order items
    const orderItemsData = orderProducts.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_name: item.product_name,
      variant_details: item.variant_details || null,
    }));

    console.log("Inserting order items:", orderItemsData);

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      console.error("Order items insertion error:", itemsError);

      // If order items fail, delete the order to maintain consistency
      await supabaseAdmin.from("orders").delete().eq("id", order.id);

      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log("Order items inserted successfully");

    // Step 3: Update inventory quantities - RESERVE STOCK
    console.log("Reserving inventory quantities...");
    const inventoryUpdateResult = await updateInventoryForOrder(
      orderProducts,
      "reserve"
    );

    if (!inventoryUpdateResult.success) {
      console.error("Failed to update inventory:", inventoryUpdateResult.error);
      // Even if inventory update fails, we don't rollback the order
      // because the order was successfully created
      console.warn(
        "Order created but inventory reservation failed. Manual intervention may be required."
      );
    } else {
      console.log("Inventory successfully reserved for order");
    }

    console.log("Order process completed successfully");

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error: any) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const { data: order, error } = await supabaseAdmin
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

    if (error) throw error;
    return order;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
}

export async function getOrdersByStore(storeId: string, limit = 50) {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (*),
        customers:customer_id (
          first_name,
          email,
          phone
        )
      `
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return orders || [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
}

// Export the inventory update function for use in order updates
export { updateInventoryForOrder };
