/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase";
import { OrderProduct, CustomerInfo } from "../../types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";

export interface CreateOrderData {
  storeId: string;
  orderNumber: string;
  customerInfo: CustomerInfo;
  orderProducts: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  additionalCharges: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  currency?: string;
  deliveryOption: string;
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
    console.log(
      "🔍 validateStockAvailability called with:",
      orderProducts.map((p) => ({
        product_name: p.product_name,
        product_id: p.product_id,
        variant_id: p.variant_id,
        quantity: p.quantity,
      }))
    );

    for (const item of orderProducts) {
      console.log(`🔍 Checking inventory for: "${item.product_name}"`, {
        product_id: item.product_id,
        variant_id: item.variant_id,
        is_variant: !!item.variant_id
      });

      let inventoryQuery;

      if (item.variant_id) {
        console.log(`🔍 Checking VARIANT inventory for variant ${item.variant_id}`);
        inventoryQuery = supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single();
      } else {
        console.log(`🔍 Checking BASE PRODUCT inventory for product ${item.product_id}`);
        inventoryQuery = supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .maybeSingle();
      }

      const { data: inventory, error } = await inventoryQuery;

      console.log("📊 Inventory check result for", item.product_name, ":", {
        inventory,
        error,
        variant_id: item.variant_id,
        product_id: item.product_id,
        is_variant: !!item.variant_id,
      });

      if (error) {
        if (error.code === 'PGRST116' && !item.variant_id) {
          console.log(`⚠️ Multiple inventory records found for base product "${item.product_name}". Checking all records...`);

          const { data: allInventory, error: multiError } = await supabaseAdmin
            .from("product_inventory")
            .select("quantity_available, quantity_reserved")
            .eq("product_id", item.product_id)
            .is("variant_id", null);

          if (multiError) {
            console.error('❌ Error fetching multiple inventory records:', multiError);
            return {
              success: false,
              error: `Failed to check inventory for "${item.product_name}"`,
            };
          }

          console.log(`📊 Found ${allInventory?.length || 0} inventory records for base product:`, allInventory);

          if (!allInventory || allInventory.length === 0) {
            return {
              success: false,
              error: `No inventory records found for "${item.product_name}"`,
            };
          }

          const firstInventory = allInventory[0];
          console.log(`✅ Using first inventory record for "${item.product_name}":`, firstInventory);

          const availableStock = firstInventory.quantity_available || 0;

          if (availableStock < item.quantity) {
            return {
              success: false,
              error: `Insufficient stock for "${item.product_name}". Available: ${availableStock}, Requested: ${item.quantity}`,
            };
          }

          continue;
        }

        const inventoryType = item.variant_id ? 'variant' : 'product';
        return {
          success: false,
          error: `${inventoryType.charAt(0).toUpperCase() + inventoryType.slice(1)} "${item.product_name}" inventory error: ${error.message}`,
        };
      }

      if (!inventory) {
        return {
          success: false,
          error: `No inventory record found for "${item.product_name}"`,
        };
      }

      const availableStock = inventory.quantity_available || 0;

      console.log(`📦 Stock check: "${item.product_name}" - Available: ${availableStock}, Required: ${item.quantity}`);

      if (availableStock < item.quantity) {
        const inventoryType = item.variant_id ? "variant" : "product";
        return {
          success: false,
          error: `Insufficient stock for "${item.product_name}" ${inventoryType}. Available: ${availableStock}, Requested: ${item.quantity}`,
        };
      }

      console.log(`✅ Sufficient stock available for "${item.product_name}"`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error in validateStockAvailability:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to update inventory (reserve or release stock)
async function updateInventoryForOrder(
  orderProducts: OrderProduct[],
  action: "reserve" | "release"
): Promise<{ success: boolean; error?: string }> {
  console.log("🔧 updateInventoryForOrder called with:", {
    action,
    products: orderProducts.map((p) => ({
      product_id: p.product_id,
      variant_id: p.variant_id,
      quantity: p.quantity,
      product_name: p.product_name,
    })),
  });

  const inventoryUpdateResults = [];

  for (const item of orderProducts) {
    try {
      console.log(
        `🔄 Updating inventory for product "${item.product_name}", variant ${item.variant_id}, quantity ${item.quantity}, action: ${action}`
      );

      if (item.variant_id) {
        console.log(
          `📦 This is a VARIANT product. Only updating variant inventory for variant_id: ${item.variant_id}`
        );

        const inventoryQuery = supabaseAdmin
          .from("product_inventory")
          .select("id, quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single();

        const { data: inventoryData, error: fetchError } = await inventoryQuery;

        console.log("📊 Variant inventory data:", inventoryData);

        if (fetchError) {
          console.error(
            `❌ Error fetching VARIANT inventory for variant ${item.variant_id}:`,
            fetchError
          );
          inventoryUpdateResults.push({
            type: "variant",
            id: item.variant_id,
            success: false,
            error: `Failed to fetch variant inventory: ${fetchError.message}`,
          });
          continue;
        }

        const updateData: any = {};
        const currentAvailable = inventoryData.quantity_available || 0;
        const currentReserved = inventoryData.quantity_reserved || 0;

        if (action === "reserve") {
          const newAvailable = Math.max(0, currentAvailable - item.quantity);
          const newReserved = currentReserved + item.quantity;
          updateData.quantity_available = newAvailable;
          updateData.quantity_reserved = newReserved;
          console.log(
            `📦 Reserving VARIANT stock: Available ${currentAvailable} → ${newAvailable}, Reserved ${currentReserved} → ${newReserved}`
          );
        } else {
          const newAvailable = currentAvailable + item.quantity;
          const newReserved = Math.max(0, currentReserved - item.quantity);
          updateData.quantity_available = newAvailable;
          updateData.quantity_reserved = newReserved;
          console.log(
            `📦 Releasing VARIANT stock: Available ${currentAvailable} → ${newAvailable}, Reserved ${currentReserved} → ${newReserved}`
          );
        }

        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabaseAdmin
          .from("product_inventory")
          .update(updateData)
          .eq("variant_id", item.variant_id);

        if (updateError) {
          console.error(
            `❌ Error updating VARIANT inventory for variant ${item.variant_id}:`,
            updateError
          );
          inventoryUpdateResults.push({
            type: "variant",
            id: item.variant_id,
            success: false,
            error: updateError.message,
          });
        } else {
          console.log(
            `✅ Successfully updated VARIANT inventory for variant ${item.variant_id}`
          );
          inventoryUpdateResults.push({
            type: "variant",
            id: item.variant_id,
            success: true,
          });
        }
      } else {
        console.log(`📦 This is a BASE product. Checking for inventory records for product_id: ${item.product_id}`);

        const inventoryQuery = supabaseAdmin
          .from("product_inventory")
          .select("id, quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null);

        const { data: inventoryRecords, error: fetchError } = await inventoryQuery;

        if (fetchError) {
          console.error(`❌ Error fetching BASE PRODUCT inventory records for product ${item.product_id}:`, fetchError);
          inventoryUpdateResults.push({
            type: "product",
            id: item.product_id,
            success: false,
            error: `Failed to fetch product inventory: ${fetchError.message}`,
          });
          continue;
        }

        console.log(`📊 Found ${inventoryRecords?.length || 0} inventory records for base product:`, inventoryRecords);

        if (!inventoryRecords || inventoryRecords.length === 0) {
          console.error(`❌ No inventory records found for base product ${item.product_id}`);
          inventoryUpdateResults.push({
            type: "product",
            id: item.product_id,
            success: false,
            error: `No inventory records found for product`,
          });
          continue;
        }

        const inventoryData = inventoryRecords[0];
        console.log(`✅ Using first inventory record for base product update:`, inventoryData);

        const updateData: any = {};
        const currentAvailable = inventoryData.quantity_available || 0;
        const currentReserved = inventoryData.quantity_reserved || 0;

        if (action === "reserve") {
          const newAvailable = Math.max(0, currentAvailable - item.quantity);
          const newReserved = currentReserved + item.quantity;
          updateData.quantity_available = newAvailable;
          updateData.quantity_reserved = newReserved;
          console.log(
            `📦 Reserving BASE PRODUCT stock: Available ${currentAvailable} → ${newAvailable}, Reserved ${currentReserved} → ${newReserved}`
          );
        } else {
          const newAvailable = currentAvailable + item.quantity;
          const newReserved = Math.max(0, currentReserved - item.quantity);
          updateData.quantity_available = newAvailable;
          updateData.quantity_reserved = newReserved;
          console.log(
            `📦 Releasing BASE PRODUCT stock: Available ${currentAvailable} → ${newAvailable}, Reserved ${currentReserved} → ${newReserved}`
          );
        }

        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabaseAdmin
          .from("product_inventory")
          .update(updateData)
          .eq("id", inventoryData.id);

        if (updateError) {
          console.error(`❌ Error updating BASE PRODUCT inventory for record ${inventoryData.id}:`, updateError);
          inventoryUpdateResults.push({
            type: "product",
            id: item.product_id,
            success: false,
            error: updateError.message,
          });
        } else {
          console.log(`✅ Successfully updated BASE PRODUCT inventory for record ${inventoryData.id}`);
          inventoryUpdateResults.push({
            type: "product",
            id: item.product_id,
            success: true,
          });
        }
      }
    } catch (inventoryError: any) {
      console.error(
        `❌ Unexpected inventory update error for item:`,
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

  const successfulUpdates = inventoryUpdateResults.filter(
    (result) => result.success
  );
  const failedUpdates = inventoryUpdateResults.filter(
    (result) => !result.success
  );

  console.log(
    `📊 Inventory updates: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`
  );

  if (failedUpdates.length > 0) {
    const errorMessage = `Failed to update inventory for ${failedUpdates.length} items: ${failedUpdates.map(f => f.error).join(', ')}`;
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
      additionalCharges,
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
    console.log("🔍 Validating stock availability...");
    const stockValidation = await validateStockAvailability(orderProducts);
    if (!stockValidation.success) {
      throw new Error(`Insufficient stock: ${stockValidation.error}`);
    }

    console.log("✅ Stock validation passed - sufficient stock available");

    // Prepare shipping address JSON
    const shippingAddress = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      address_line_1: customerInfo.address,
      city: customerInfo.city,
      country: "Bangladesh",
    };

    console.log("🔄 Creating order with data:", {
      orderNumber,
      storeId,
      customerId: customerInfo.customer_id,
      orderProductsCount: orderProducts.length,
      subtotal,
      discount,
      additionalCharges,
      deliveryCost,
      totalAmount,
    });

    // Step 1: Create the order - INCLUDING additional_charges
    const orderInsertData = {
      order_number: orderNumber,
      store_id: storeId,
      customer_id: customerInfo.customer_id || null,
      status: status,
      subtotal: subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      additional_charges: additionalCharges,
      shipping_fee: deliveryCost,
      total_amount: totalAmount,
      currency: currency,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      notes: customerInfo.notes,
      delivery_option: orderData.deliveryOption,
    };

    console.log("📦 Order insert data with additional_charges:", orderInsertData);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([orderInsertData])
      .select("id, order_number, customer_id")
      .single();

    if (orderError) {
      console.error("❌ Order insertion error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("✅ Order created successfully:", order);

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

    console.log("📝 Inserting order items:", orderItemsData);

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      console.error("❌ Order items insertion error:", itemsError);

      // If order items fail, delete the order to maintain consistency
      await supabaseAdmin.from("orders").delete().eq("id", order.id);

      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log("✅ Order items inserted successfully");

    // Step 3: Update inventory quantities - RESERVE STOCK
    console.log("🔄 Reserving inventory quantities...");
    const inventoryUpdateResult = await updateInventoryForOrder(
      orderProducts,
      "reserve"
    );

    if (!inventoryUpdateResult.success) {
      console.error(
        "❌ Failed to update inventory:",
        inventoryUpdateResult.error
      );
      console.warn(
        "⚠️ Order created but inventory reservation failed. Manual intervention may be required."
      );
    } else {
      console.log("✅ Inventory successfully reserved for order");
    }

    console.log("🎉 Order process delivered successfully");

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error: any) {
    console.error("❌ Error creating order:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

export async function createCustomerOrder(
  orderData: any
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
      additionalCharges,
      deliveryCost,
      totalAmount,
      status = "pending",
      paymentStatus = "pending",
      paymentMethod,
      currency = "BDT",
      deliveryOption,
    } = orderData;

    // Validate required fields
    if (!storeId) throw new Error("Store ID is required");
    if (!customerInfo.name || !customerInfo.phone) {
      throw new Error("Customer name and phone are required");
    }
    if (orderProducts.length === 0) {
      throw new Error("At least one product is required");
    }

    // ✅ INVENTORY VALIDATION
    console.log("🔍 Validating stock availability for customer order...");
    const stockValidation = await validateStockAvailability(orderProducts);
    if (!stockValidation.success) {
      throw new Error(`Insufficient stock: ${stockValidation.error}`);
    }

    console.log("✅ Stock validation passed - sufficient stock available");

    // Prepare shipping address
    const shippingAddress = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      email: customerInfo.email,
      address_line_1: customerInfo.address,
      city: customerInfo.city,
      country: customerInfo.country || "Bangladesh",
    };

    console.log("🔄 Creating customer order in database...");

    // ✅ FIX: Use store_customer_id instead of auth user ID
    const storeCustomerId = customerInfo.customer_id || null;

    // Create order - INCLUDING additional_charges
    const orderInsertData = {
      order_number: orderNumber,
      store_id: storeId,
      customer_id: storeCustomerId,
      status: status,
      subtotal: subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      additional_charges: additionalCharges,
      shipping_fee: deliveryCost,
      total_amount: totalAmount,
      currency: currency,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      delivery_option: deliveryOption,
    };

    console.log("📦 Customer order insert data with additional_charges:", {
      ...orderInsertData,
      customer_id: storeCustomerId,
      has_customer: !!storeCustomerId
    });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([orderInsertData])
      .select("id, order_number, customer_id")
      .single();

    if (orderError) {
      console.error("❌ Customer order creation error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create order items
    const orderItemsData = orderProducts.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_name: item.product_name,
      variant_details: item.variant_details || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      console.error("❌ Customer order items error:", itemsError);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // ✅ INVENTORY UPDATE
    console.log("🔄 Updating inventory for customer order...");
    const inventoryUpdateResult = await updateInventoryForOrder(
      orderProducts,
      "reserve"
    );

    if (!inventoryUpdateResult.success) {
      console.error(
        "❌ Failed to update inventory:",
        inventoryUpdateResult.error
      );
      console.warn(
        "⚠️ Customer order created but inventory reservation failed. Manual intervention may be required."
      );
    } else {
      console.log("✅ Inventory successfully reserved for customer order");
    }

    console.log("✅ Customer order created successfully:", order.id);

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error: any) {
    console.error("❌ Error creating customer order:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

// Customer order number generator
export function generateCustomerOrderNumber(storeSlug: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${storeSlug.toUpperCase()}-${timestamp}${random}`;
}

// Other functions remain the same...
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