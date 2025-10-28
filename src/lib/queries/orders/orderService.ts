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
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export async function createOrder(orderData: CreateOrderData): Promise<CreateOrderResult> {
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
      currency = "BDT"
    } = orderData;

    // Validate required fields
    if (!storeId) {
      throw new Error('Store ID is required');
    }

    if (!orderNumber) {
      throw new Error('Order number is required');
    }

    if (!customerInfo.name || !customerInfo.phone) {
      throw new Error('Customer name and phone are required');
    }

    if (orderProducts.length === 0) {
      throw new Error('At least one product is required');
    }

    // Prepare shipping address JSON
    const shippingAddress = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      address_line_1: customerInfo.address,
      city: customerInfo.city,
      country: "Bangladesh",
    };

    console.log('Creating order with data:', {
      orderNumber,
      storeId,
      customerId: customerInfo.customer_id,
      orderProductsCount: orderProducts.length,
      subtotal,
      totalAmount
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
    };

    console.log('Order insert data:', orderInsertData);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderInsertData])
      .select('id, order_number, customer_id')
      .single();

    if (orderError) {
      console.error('Order insertion error:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Order created successfully:', order);

    // Step 2: Insert order items
    const orderItemsData = orderProducts.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_name: item.product_name,
      variant_details: item.variant_details || null,
    }));

    console.log('Inserting order items:', orderItemsData);

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
      console.error('Order items insertion error:', itemsError);
      
      // If order items fail, delete the order to maintain consistency
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', order.id);
      
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log('Order items inserted successfully');

    // Step 3: Update inventory quantities in product_inventory table
    console.log('Updating inventory quantities...');
    
    const inventoryUpdateResults = [];
    
    for (const item of orderProducts) {
      try {
        console.log(`Updating inventory for product ${item.product_id}, variant ${item.variant_id}, quantity ${item.quantity}`);

        if (item.variant_id) {
          // Update variant inventory in product_inventory table
          console.log(`Updating variant inventory for ${item.variant_id}`);
          
          // First, get current inventory for the variant
          const { data: inventoryData, error: fetchError } = await supabaseAdmin
            .from('product_inventory')
            .select('id, quantity_available, quantity_reserved')
            .eq('variant_id', item.variant_id)
            .single();

          if (fetchError) {
            console.error(`Error fetching variant inventory ${item.variant_id}:`, {
              message: fetchError.message,
              details: fetchError.details,
              hint: fetchError.hint,
              code: fetchError.code
            });
            inventoryUpdateResults.push({
              type: 'variant',
              id: item.variant_id,
              success: false,
              error: `Failed to fetch variant inventory: ${fetchError.message}`
            });
            continue;
          }

          // Calculate new reserved quantity
          const currentReserved = inventoryData.quantity_reserved || 0;
          const newReserved = currentReserved + item.quantity;

          // Update variant inventory
          const { error: variantStockError } = await supabaseAdmin
            .from('product_inventory')
            .update({ 
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('variant_id', item.variant_id);

          if (variantStockError) {
            console.error(`Error updating variant inventory for ${item.variant_id}:`, {
              message: variantStockError.message,
              details: variantStockError.details,
              hint: variantStockError.hint,
              code: variantStockError.code
            });
            inventoryUpdateResults.push({
              type: 'variant',
              id: item.variant_id,
              success: false,
              error: variantStockError.message
            });
          } else {
            console.log(`Successfully updated variant ${item.variant_id} inventory from ${currentReserved} to ${newReserved}`);
            inventoryUpdateResults.push({
              type: 'variant',
              id: item.variant_id,
              success: true
            });
          }
        } else {
          // Update product inventory in product_inventory table
          console.log(`Updating product inventory for ${item.product_id}`);
          
          // First, get current inventory for the product
          const { data: inventoryData, error: fetchError } = await supabaseAdmin
            .from('product_inventory')
            .select('id, quantity_available, quantity_reserved')
            .eq('product_id', item.product_id)
            .is('variant_id', null)
            .single();

          if (fetchError) {
            console.error(`Error fetching product inventory ${item.product_id}:`, {
              message: fetchError.message,
              details: fetchError.details,
              hint: fetchError.hint,
              code: fetchError.code
            });
            inventoryUpdateResults.push({
              type: 'product',
              id: item.product_id,
              success: false,
              error: `Failed to fetch product inventory: ${fetchError.message}`
            });
            continue;
          }

          // Calculate new reserved quantity
          const currentReserved = inventoryData.quantity_reserved || 0;
          const newReserved = currentReserved + item.quantity;

          // Update product inventory
          const { error: productStockError } = await supabaseAdmin
            .from('product_inventory')
            .update({ 
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.product_id)
            .is('variant_id', null);

          if (productStockError) {
            console.error(`Error updating product inventory for ${item.product_id}:`, {
              message: productStockError.message,
              details: productStockError.details,
              hint: productStockError.hint,
              code: productStockError.code
            });
            inventoryUpdateResults.push({
              type: 'product',
              id: item.product_id,
              success: false,
              error: productStockError.message
            });
          } else {
            console.log(`Successfully updated product ${item.product_id} inventory from ${currentReserved} to ${newReserved}`);
            inventoryUpdateResults.push({
              type: 'product',
              id: item.product_id,
              success: true
            });
          }
        }
      } catch (inventoryError: any) {
        console.error(`Unexpected inventory update error for item:`, item, {
          message: inventoryError.message,
          stack: inventoryError.stack
        });
        inventoryUpdateResults.push({
          type: item.variant_id ? 'variant' : 'product',
          id: item.variant_id || item.product_id,
          success: false,
          error: inventoryError.message
        });
      }
    }

    // Log inventory update results
    const successfulUpdates = inventoryUpdateResults.filter(result => result.success);
    const failedUpdates = inventoryUpdateResults.filter(result => !result.success);
    
    console.log(`Inventory updates: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`);
    
    if (failedUpdates.length > 0) {
      console.warn('Some inventory updates failed:', failedUpdates);
    }

    console.log('Order process completed successfully');

    return {
      success: true,
      orderId: order.id
    };

  } catch (error: any) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (*),
        customers:customer_id (
          id,
          first_name,
          email,
          phone
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

export async function getOrdersByStore(storeId: string, limit = 50) {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (*),
        customers:customer_id (
          first_name,
          email,
          phone
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return orders || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}