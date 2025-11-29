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
  status: "pending" | "confirmed" | "completed" | "shipped" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
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
        // ✅ Check VARIANT inventory - should be unique per variant
        console.log(`🔍 Checking VARIANT inventory for variant ${item.variant_id}`);
        inventoryQuery = supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single(); // Variants should have unique inventory records
      } else {
        // ✅ Check BASE PRODUCT inventory - FIXED: Use .maybeSingle() and handle duplicates
        console.log(`🔍 Checking BASE PRODUCT inventory for product ${item.product_id}`);
        inventoryQuery = supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .maybeSingle(); // Use maybeSingle to handle no records or multiple records
      }

      const { data: inventory, error } = await inventoryQuery;

      console.log("📊 Inventory check result for", item.product_name, ":", {
        inventory,
        error,
        variant_id: item.variant_id,
        product_id: item.product_id,
        is_variant: !!item.variant_id,
      });

      // ✅ FIXED: Handle the case where there are multiple inventory records for base products
      if (error) {
        // If it's a "Cardinality violation" error (multiple rows), we need to handle it
        if (error.code === 'PGRST116' && !item.variant_id) {
          console.log(`⚠️ Multiple inventory records found for base product "${item.product_name}". Checking all records...`);

          // Query for ALL inventory records for this base product
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

          // ✅ Use the FIRST inventory record (you might want to sum them instead)
          const firstInventory = allInventory[0];
          console.log(`✅ Using first inventory record for "${item.product_name}":`, firstInventory);

          const availableStock = firstInventory.quantity_available || 0;

          if (availableStock < item.quantity) {
            return {
              success: false,
              error: `Insufficient stock for "${item.product_name}". Available: ${availableStock}, Requested: ${item.quantity}`,
            };
          }

          // Continue to next item
          continue;
        }

        // Handle other errors
        const inventoryType = item.variant_id ? 'variant' : 'product';
        return {
          success: false,
          error: `${inventoryType.charAt(0).toUpperCase() + inventoryType.slice(1)} "${item.product_name}" inventory error: ${error.message}`,
        };
      }

      // ✅ Handle case where no inventory record is found
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
        // ✅ VARIANT PRODUCT: Only update variant inventory
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

        // Calculate new quantities for VARIANT
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

        // Update ONLY the variant inventory
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
        // ✅ BASE PRODUCT (no variants): Handle multiple inventory records
        console.log(`📦 This is a BASE product. Checking for inventory records for product_id: ${item.product_id}`);

        // First, get ALL inventory records for this base product
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

        // ✅ Use the FIRST inventory record (you might want to choose a different strategy)
        const inventoryData = inventoryRecords[0];
        console.log(`✅ Using first inventory record for base product update:`, inventoryData);

        // Calculate new quantities for BASE PRODUCT
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

        // Update the specific inventory record
        const { error: updateError } = await supabaseAdmin
          .from("product_inventory")
          .update(updateData)
          .eq("id", inventoryData.id); // ✅ Use the specific inventory record ID

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

  // Check results
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
      delivery_option: orderData.deliveryOption,
    };

    console.log("📦 Order insert data:", orderInsertData);

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

    console.log("🎉 Order process completed successfully");

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
    // Now customer_id will reference store_customers.id
    const storeCustomerId = customerInfo.customer_id || null;

    // Create order
    const orderInsertData = {
      order_number: orderNumber,
      store_id: storeId,
      customer_id: storeCustomerId, // ✅ Now links to store_customers.id
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
      delivery_option: deliveryOption,
    };

    console.log("📦 Order insert data:", {
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

// Customer order functions
export function generateCustomerOrderNumber(storeSlug: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${storeSlug.toUpperCase()}-${timestamp}${random}`;
}