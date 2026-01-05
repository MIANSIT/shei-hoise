/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase";
import { OrderStatus, PaymentStatus, DeliveryOption } from "@/lib/types/enums";

export interface UpdateOrderData {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  delivery_option?: DeliveryOption;
  payment_method?: string;
  notes?: string;
  shipping_fee?: number;
  tax_amount?: number;
  total_amount?: number;
  discount_amount?: number;
}

export interface UpdateOrderResult {
  success: boolean;
  error?: string;
  updatedOrder?: any;
}

export async function updateOrder(
  orderId: string, 
  updates: UpdateOrderData
): Promise<UpdateOrderResult> {
  try {

    // Validate order exists
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return { 
        success: false, 
        error: `Order not found: ${fetchError.message}` 
      };
    }

    // Prepare update data with timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };


    // ✅ FIXED: Remove comments from the query string
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        order_items (*),
        store_customers:customer_id (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return { 
        success: false, 
        error: `Failed to update order: ${updateError.message}` 
      };
    }


    // Handle inventory updates if status changes from/to specific states
    await handleInventoryUpdates(existingOrder, updates, orderId);

    return {
      success: true,
      updatedOrder
    };

  } catch (error: any) {
    console.error('Error in updateOrder:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred while updating order'
    };
  }
}

// Handle inventory updates based on status changes
async function handleInventoryUpdates(
  existingOrder: any, 
  updates: UpdateOrderData, 
  orderId: string
): Promise<void> {
  try {
    // Only process inventory if status is changing
    if (!updates.status || updates.status === existingOrder.status) {
      return;
    }

    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (!orderItems || orderItems.length === 0) {
      return;
    }

    // Handle different status transitions
    switch (updates.status) {
      case 'cancelled':
        // Return reserved stock to available stock when order is cancelled
        await returnReservedStockToAvailable(orderItems);
        break;
        
      case 'delivered':
        // Deduct reserved stock when order is delivered
        await deductReservedStock(orderItems);
        break;
        
      case 'confirmed':
        // Additional logic for confirmed orders if needed
        break;
        
      default:
    }
  } catch (error) {
    console.error('Error in handleInventoryUpdates:', error);
    // Don't throw error here as order update was successful
  }
}

// Return reserved stock to available when order is cancelled
async function returnReservedStockToAvailable(orderItems: any[]): Promise<void> {
  for (const item of orderItems) {
    try {
      if (item.variant_id) {
        // Update variant inventory
        const { data: inventory } = await supabaseAdmin
          .from('product_inventory')
          .select('quantity_available, quantity_reserved')
          .eq('variant_id', item.variant_id)
          .single();

        if (inventory) {
          const newAvailable = (inventory.quantity_available || 0) + item.quantity;
          const newReserved = Math.max(0, (inventory.quantity_reserved || 0) - item.quantity);

          await supabaseAdmin
            .from('product_inventory')
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('variant_id', item.variant_id);
        }
      } else {
        // Update product inventory
        const { data: inventory } = await supabaseAdmin
          .from('product_inventory')
          .select('quantity_available, quantity_reserved')
          .eq('product_id', item.product_id)
          .is('variant_id', null)
          .single();

        if (inventory) {
          const newAvailable = (inventory.quantity_available || 0) + item.quantity;
          const newReserved = Math.max(0, (inventory.quantity_reserved || 0) - item.quantity);

          await supabaseAdmin
            .from('product_inventory')
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.product_id)
            .is('variant_id', null);
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
        // Update variant inventory - just reduce reserved quantity
        const { data: inventory } = await supabaseAdmin
          .from('product_inventory')
          .select('quantity_reserved')
          .eq('variant_id', item.variant_id)
          .single();

        if (inventory) {
          const newReserved = Math.max(0, (inventory.quantity_reserved || 0) - item.quantity);

          await supabaseAdmin
            .from('product_inventory')
            .update({
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('variant_id', item.variant_id);
        }
      } else {
        // Update product inventory - just reduce reserved quantity
        const { data: inventory } = await supabaseAdmin
          .from('product_inventory')
          .select('quantity_reserved')
          .eq('product_id', item.product_id)
          .is('variant_id', null)
          .single();

        if (inventory) {
          const newReserved = Math.max(0, (inventory.quantity_reserved || 0) - item.quantity);

          await supabaseAdmin
            .from('product_inventory')
            .update({
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.product_id)
            .is('variant_id', null);
        }
      }
    } catch (error) {
      console.error(`Error deducting stock for item ${item.id}:`, error);
    }
  }
}

// Specific function for updating order status only
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus
): Promise<UpdateOrderResult> {
  return updateOrder(orderId, { status });
}

// Specific function for updating payment status only
export async function updatePaymentStatus(
  orderId: string, 
  paymentStatus: PaymentStatus
): Promise<UpdateOrderResult> {
  return updateOrder(orderId, { payment_status: paymentStatus });
}

// Specific function for updating delivery option
export async function updateDeliveryOption(
  orderId: string, 
  deliveryOption: DeliveryOption
): Promise<UpdateOrderResult> {
  return updateOrder(orderId, { delivery_option: deliveryOption });
}

// Specific function for updating payment method
export async function updatePaymentMethod(
  orderId: string, 
  paymentMethod: string
): Promise<UpdateOrderResult> {
  return updateOrder(orderId, { payment_method: paymentMethod });
}

// Specific function for updating order notes
export async function updateOrderNotes(
  orderId: string, 
  notes: string
): Promise<UpdateOrderResult> {
  return updateOrder(orderId, { notes });
}

// Function for updating discount amount
export async function updateDiscountAmount(
  orderId: string, 
  discountAmount: number
): Promise<UpdateOrderResult> {
  return updateOrder(orderId, { discount_amount: discountAmount });
}