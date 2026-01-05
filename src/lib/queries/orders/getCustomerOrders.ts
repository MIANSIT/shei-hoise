// lib/queries/orders/getCustomerOrders.ts
import { supabase } from "@/lib/supabase";
import { StoreOrder } from "@/lib/types/order";

export async function getCustomerOrders(storeCustomerId: string): Promise<StoreOrder[]> {
  try {
    
    // Fetch all orders for this customer
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        stores (
          id,
          store_name,
          store_slug
        )
      `)
      .eq('customer_id', storeCustomerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching customer orders:', error);
      throw error;
    }

    
    // Log first order details if available
    if (orders && orders.length > 0) {
     
    }
    
    return orders || [];
  } catch (error) {
    console.error('❌ Error in getCustomerOrders:', error);
    throw error;
  }
}