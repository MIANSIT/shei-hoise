"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OrderProduct, CustomerInfo } from "../../types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { getPhoneRiskLevel } from "@/lib/utils/riskScoring";
import { explodeBundleOrderProducts } from "./bundleExplosion";
import { bundleItemKey } from "./bundleItemKey";

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
  courier?: string;
  currency?: string;
  deliveryOption: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  fbPurchaseEventStatus?: "sent" | "held";
}

// Helper function to validate stock availability. Fetches all items'
// inventory in two batched queries (variant-scoped / base-product-scoped)
// instead of one sequential round trip per line item — with several items
// on an order, the old per-item loop was the single biggest contributor to
// slow order submission.
async function validateStockAvailability(
  orderProducts: OrderProduct[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const variantIds = [
      ...new Set(
        orderProducts
          .map((item) => item.variant_id)
          .filter((id): id is string => !!id)
      ),
    ];
    const baseProductIds = [
      ...new Set(
        orderProducts.filter((item) => !item.variant_id).map((item) => item.product_id)
      ),
    ];

    const [
      { data: variantInventory, error: variantError },
      { data: baseInventory, error: baseError },
    ] = await Promise.all([
      variantIds.length
        ? supabaseAdmin
            .from("product_inventory")
            .select("variant_id, quantity_available, quantity_reserved")
            .in("variant_id", variantIds)
        : Promise.resolve({ data: [] as { variant_id: string | null; quantity_available: number | null; quantity_reserved: number | null }[], error: null }),
      baseProductIds.length
        ? supabaseAdmin
            .from("product_inventory")
            .select("product_id, quantity_available, quantity_reserved")
            .in("product_id", baseProductIds)
            .is("variant_id", null)
        : Promise.resolve({ data: [] as { product_id: string | null; quantity_available: number | null; quantity_reserved: number | null }[], error: null }),
    ]);

    if (variantError) {
      return {
        success: false,
        error: `Failed to check variant inventory: ${variantError.message}`,
      };
    }
    if (baseError) {
      return {
        success: false,
        error: `Failed to check product inventory: ${baseError.message}`,
      };
    }

    // First matching row wins per id — mirrors the previous behavior for
    // products with more than one inventory row (no variant_id).
    const variantMap = new Map<string, { quantity_available: number | null }>();
    for (const row of variantInventory ?? []) {
      if (row.variant_id && !variantMap.has(row.variant_id)) variantMap.set(row.variant_id, row);
    }
    const productMap = new Map<string, { quantity_available: number | null }>();
    for (const row of baseInventory ?? []) {
      if (row.product_id && !productMap.has(row.product_id)) productMap.set(row.product_id, row);
    }

    for (const item of orderProducts) {
      const inventory = item.variant_id
        ? variantMap.get(item.variant_id)
        : productMap.get(item.product_id);

      if (!inventory) {
        return {
          success: false,
          error: `No inventory record found for "${item.product_name}"`,
        };
      }

      const availableStock = inventory.quantity_available || 0;

      if (availableStock < item.quantity) {
        const inventoryType = item.variant_id ? "variant" : "product";
        return {
          success: false,
          error: `Insufficient stock for "${item.product_name}" ${inventoryType}. Available: ${availableStock}, Requested: ${item.quantity}`,
        };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error in validateStockAvailability:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to update inventory (reserve, release, or finalize stock)
// - "reserve": order placed - move stock from available into reserved
// - "release": order cancelled - move stock from reserved back into available
// - "finalize": order delivered - the stock has actually left the building,
//   so just clear the reservation hold (reserved only, available untouched,
//   since it was already decremented when the stock was reserved)
async function updateInventoryForOrder(
  orderProducts: OrderProduct[],
  action: "reserve" | "release" | "finalize"
): Promise<{ success: boolean; error?: string }> {
  

  // Batch-fetch every item's current inventory row up front (2 queries
  // instead of 1 per item), then fire all the per-row updates concurrently —
  // the old code did a sequential fetch-then-update round trip for each
  // line item one at a time, which dominated order-submission time for
  // multi-item orders.
  const variantIds = [
    ...new Set(
      orderProducts
        .map((item) => item.variant_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const baseProductIds = [
    ...new Set(
      orderProducts.filter((item) => !item.variant_id).map((item) => item.product_id)
    ),
  ];

  const [
    { data: variantInventoryRows, error: variantFetchError },
    { data: baseInventoryRows, error: baseFetchError },
  ] = await Promise.all([
    variantIds.length
      ? supabaseAdmin
          .from("product_inventory")
          .select("id, variant_id, quantity_available, quantity_reserved")
          .in("variant_id", variantIds)
      : Promise.resolve({ data: [] as { id: string; variant_id: string | null; quantity_available: number | null; quantity_reserved: number | null }[], error: null }),
    baseProductIds.length
      ? supabaseAdmin
          .from("product_inventory")
          .select("id, product_id, quantity_available, quantity_reserved")
          .in("product_id", baseProductIds)
          .is("variant_id", null)
      : Promise.resolve({ data: [] as { id: string; product_id: string | null; quantity_available: number | null; quantity_reserved: number | null }[], error: null }),
  ]);

  if (variantFetchError) {
    console.error("❌ Error fetching variant inventory:", variantFetchError);
  }
  if (baseFetchError) {
    console.error("❌ Error fetching base product inventory:", baseFetchError);
  }

  const variantInvMap = new Map<string, { id: string; quantity_available: number | null; quantity_reserved: number | null }>();
  for (const row of variantInventoryRows ?? []) {
    if (row.variant_id && !variantInvMap.has(row.variant_id)) variantInvMap.set(row.variant_id, row);
  }
  const productInvMap = new Map<string, { id: string; quantity_available: number | null; quantity_reserved: number | null }>();
  for (const row of baseInventoryRows ?? []) {
    if (row.product_id && !productInvMap.has(row.product_id)) productInvMap.set(row.product_id, row);
  }

  const inventoryUpdateResults = await Promise.all(
    orderProducts.map(async (item) => {
      const type = item.variant_id ? "variant" : "product";
      const id = item.variant_id || item.product_id;

      try {
        const inventoryData = item.variant_id
          ? variantInvMap.get(item.variant_id)
          : productInvMap.get(item.product_id);

        if (!inventoryData) {
          console.error(`❌ No inventory record found for ${type} ${id}`);
          return { type, id, success: false, error: `No inventory record found for ${type}` };
        }

        const updateData: any = {};
        const currentAvailable = inventoryData.quantity_available || 0;
        const currentReserved = inventoryData.quantity_reserved || 0;

        if (action === "reserve") {
          updateData.quantity_available = Math.max(0, currentAvailable - item.quantity);
          updateData.quantity_reserved = currentReserved + item.quantity;
        } else if (action === "finalize") {
          // Stock already left available stock when reserved; just clear the hold
          updateData.quantity_reserved = Math.max(0, currentReserved - item.quantity);
        } else {
          updateData.quantity_available = currentAvailable + item.quantity;
          updateData.quantity_reserved = Math.max(0, currentReserved - item.quantity);
        }

        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabaseAdmin
          .from("product_inventory")
          .update(updateData)
          .eq("id", inventoryData.id);

        if (updateError) {
          console.error(`❌ Error updating ${type} inventory for ${id}:`, updateError);
          return { type, id, success: false, error: updateError.message };
        }

        return { type, id, success: true };
      } catch (inventoryError: any) {
        console.error(`❌ Unexpected inventory update error for item:`, item, inventoryError);
        return { type, id, success: false, error: inventoryError.message };
      }
    })
  );

  const successfulUpdates = inventoryUpdateResults.filter(
    (result) => result.success
  );
  const failedUpdates = inventoryUpdateResults.filter(
    (result) => !result.success
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

    // Step 0: Resolve any bundle lines into their component purchases, then
    // validate stock against the resolved (bundle-header-free) list — a
    // bundle header has no product_inventory row of its own.
    const { stockRelevantItems, componentsByHeaderKey } =
      await explodeBundleOrderProducts(orderProducts);

    const stockValidation = await validateStockAvailability(stockRelevantItems);
    if (!stockValidation.success) {
      throw new Error(`Insufficient stock: ${stockValidation.error}`);
    }


    // Prepare shipping address JSON
    const shippingAddress = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      address_line_1: customerInfo.address,
      city: customerInfo.city,
      country: "Bangladesh",
    };

    

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
      courier: orderData.courier || null,
    };


    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([orderInsertData])
      .select("id, order_number, customer_id")
      .single();

    if (orderError) {
      console.error("❌ Order insertion error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }


    // Step 2: Insert order items — headers + simple lines first, so bundle
    // component rows can be linked back via parent_order_item_id once the
    // header's real id comes back from the insert.
    const orderItemsData = orderProducts.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_name: item.product_name,
      variant_details: item.variant_details || null,
      cost_price: item.cost_price ?? null,
    }));


    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsData)
      .select("id, product_id, variant_id");

    if (itemsError) {
      console.error("❌ Order items insertion error:", itemsError);

      // If order items fail, delete the order to maintain consistency
      await supabaseAdmin.from("orders").delete().eq("id", order.id);

      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    if (componentsByHeaderKey.size > 0) {
      const componentRowsToInsert = (insertedItems ?? []).flatMap((header) => {
        const components = componentsByHeaderKey.get(
          bundleItemKey(header.product_id, header.variant_id)
        );
        if (!components) return [];
        return components.map((c) => ({
          order_id: order.id,
          product_id: c.product_id,
          variant_id: c.variant_id || null,
          quantity: c.quantity,
          unit_price: c.unit_price,
          total_price: c.total_price,
          product_name: c.product_name,
          variant_details: null,
          cost_price: c.cost_price ?? null,
          parent_order_item_id: header.id,
        }));
      });

      if (componentRowsToInsert.length > 0) {
        const { error: componentsError } = await supabaseAdmin
          .from("order_items")
          .insert(componentRowsToInsert);
        if (componentsError) {
          console.error(
            "❌ Bundle component items insertion error:",
            componentsError
          );
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          throw new Error(
            `Failed to create bundle component items: ${componentsError.message}`
          );
        }
      }
    }


    // Step 3: Update inventory quantities - RESERVE STOCK
    const inventoryUpdateResult = await updateInventoryForOrder(
      stockRelevantItems,
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
    }

    // Step 4: If the order is created already marked as delivered (direct
    // delivery, skipping pending/confirmed/shipped), there is no later
    // status-change update to trigger the usual "finalize" deduction - so
    // clear the reservation hold right away or it would stay stuck forever.
    if (status === OrderStatus.DELIVERED) {
      const finalizeResult = await updateInventoryForOrder(
        stockRelevantItems,
        "finalize"
      );
      if (!finalizeResult.success) {
        console.error(
          "❌ Failed to finalize inventory for directly-delivered order:",
          finalizeResult.error
        );
      }
    }

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

    // ✅ INVENTORY VALIDATION — resolve bundle lines into their component
    // purchases first (see createOrder above for why).
    const { stockRelevantItems, componentsByHeaderKey } =
      await explodeBundleOrderProducts(orderProducts);

    const stockValidation = await validateStockAvailability(stockRelevantItems);
    if (!stockValidation.success) {
      throw new Error(`Insufficient stock: ${stockValidation.error}`);
    }


    // Prepare shipping address
    const shippingAddress = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      email: customerInfo.email,
      address_line_1: customerInfo.address,
      city: customerInfo.city,
      country: customerInfo.country || "Bangladesh",
    };


    // ✅ FIX: Use store_customer_id instead of auth user ID
    const storeCustomerId = customerInfo.customer_id || null;

    // COD fake-order protection: high-risk phone numbers get their Facebook
    // Purchase event held until the order is actually delivered, instead of
    // firing immediately, so a fake/cancelled order never trains Facebook's
    // ad algorithm to find more fake orders. Only relevant for COD — an
    // already-paid order carries no such risk.
    let fbPurchaseEventStatus: "sent" | "held" = "sent";
    if (paymentMethod === "cod") {
      const risk = await getPhoneRiskLevel(customerInfo.phone);
      if (risk.level === "high") fbPurchaseEventStatus = "held";
    }

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
      fb_purchase_event_status: fbPurchaseEventStatus,
    };

    

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([orderInsertData])
      .select("id, order_number, customer_id")
      .single();

    if (orderError) {
      console.error("❌ Customer order creation error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create order items. Storefront cart data never carries tp_price (it's
    // not fetched for the customer-facing product query), so the sale cost
    // is looked up here — server-side only — right before insert. This is
    // still "cost at time of sale," just resolved on the server instead of
    // carried from the client like the admin-created-order path does.
    const productIds = [...new Set(orderProducts.map((item: any) => item.product_id))];
    const variantIds = [
      ...new Set(
        orderProducts
          .map((item: any) => item.variant_id)
          .filter((id: string | null | undefined): id is string => !!id)
      ),
    ];

    const [{ data: costProducts }, { data: costVariants }] = await Promise.all([
      productIds.length
        ? supabaseAdmin.from("products").select("id, tp_price").in("id", productIds)
        : Promise.resolve({ data: [] as { id: string; tp_price: number | null }[] }),
      variantIds.length
        ? supabaseAdmin.from("product_variants").select("id, tp_price").in("id", variantIds)
        : Promise.resolve({ data: [] as { id: string; tp_price: number | null }[] }),
    ]);

    const productCostMap = new Map((costProducts || []).map((p) => [p.id, p.tp_price]));
    const variantCostMap = new Map((costVariants || []).map((v) => [v.id, v.tp_price]));

    const orderItemsData = orderProducts.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_name: item.product_name,
      variant_details: item.variant_details || null,
      cost_price: item.variant_id
        ? (variantCostMap.get(item.variant_id) ?? null)
        : (productCostMap.get(item.product_id) ?? null),
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsData)
      .select("id, product_id, variant_id");

    if (itemsError) {
      console.error("❌ Customer order items error:", itemsError);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    if (componentsByHeaderKey.size > 0) {
      const componentRowsToInsert = (insertedItems ?? []).flatMap((header) => {
        const components = componentsByHeaderKey.get(
          bundleItemKey(header.product_id, header.variant_id)
        );
        if (!components) return [];
        return components.map((c) => ({
          order_id: order.id,
          product_id: c.product_id,
          variant_id: c.variant_id || null,
          quantity: c.quantity,
          unit_price: c.unit_price,
          total_price: c.total_price,
          product_name: c.product_name,
          variant_details: null,
          cost_price: c.cost_price ?? null,
          parent_order_item_id: header.id,
        }));
      });

      if (componentRowsToInsert.length > 0) {
        const { error: componentsError } = await supabaseAdmin
          .from("order_items")
          .insert(componentRowsToInsert);
        if (componentsError) {
          console.error(
            "❌ Bundle component items insertion error:",
            componentsError
          );
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          throw new Error(
            `Failed to create bundle component items: ${componentsError.message}`
          );
        }
      }
    }

    // ✅ INVENTORY UPDATE
    const inventoryUpdateResult = await updateInventoryForOrder(
      stockRelevantItems,
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
    }

    // Same direct-delivery safeguard as createOrder() above.
    if (status === OrderStatus.DELIVERED) {
      const finalizeResult = await updateInventoryForOrder(
        stockRelevantItems,
        "finalize"
      );
      if (!finalizeResult.success) {
        console.error(
          "❌ Failed to finalize inventory for directly-delivered order:",
          finalizeResult.error
        );
      }
    }

    return {
      success: true,
      orderId: order.id,
      fbPurchaseEventStatus,
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