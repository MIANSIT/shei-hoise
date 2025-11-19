// lib/queries/orders/getCustomerOrders.ts
import { supabase } from "@/lib/supabase";
import { StoreOrder } from "@/lib/types/order";

export async function getCustomerOrders(storeCustomerId: string): Promise<StoreOrder[]> {
  try {
    console.log('🔄 Fetching orders for store customer:', storeCustomerId);
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        stores (
          id,
          store_name,
          store_slug
        ),
        store_customers!customer_id (
          id,
          name,
          email,
          phone,
          auth_user_id
        )
      `)
      .eq('customer_id', storeCustomerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching customer orders:', error);
      throw error;
    }

    console.log(`✅ Found ${orders?.length || 0} orders for store customer`);
    return orders || [];
  } catch (error) {
    console.error('❌ Error in getCustomerOrders:', error);
    throw error;
  }
}