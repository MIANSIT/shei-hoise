// lib/queries/orders/getCustomerOrders.ts
import { supabase } from "@/lib/supabase";
import { StoreOrder } from "@/lib/types/order";

export async function getCustomerOrders(storeCustomerId: string): Promise<StoreOrder[]> {
  try {
    console.log('🔄 Fetching orders for store customer ID:', storeCustomerId);
    
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

    console.log(`✅ Found ${orders?.length || 0} orders for store customer`);
    
    // Log first order details if available
    if (orders && orders.length > 0) {
      console.log('📄 First order sample:', {
        id: orders[0].id,
        customer_id: orders[0].customer_id,
        order_number: orders[0].order_number,
        store: orders[0].stores
      });
    }
    
    return orders || [];
  } catch (error) {
    console.error('❌ Error in getCustomerOrders:', error);
    throw error;
  }
}