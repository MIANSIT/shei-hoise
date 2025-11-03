import { supabase } from "@/lib/supabase";
import { StoreOrder } from "@/lib/types/order";

export async function getCustomerOrders(customerId: string): Promise<StoreOrder[]> {
  try {
    console.log('Fetching orders for customer:', customerId);
    
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
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }

    console.log(`Found ${orders?.length || 0} orders for customer`);
    return orders || [];
  } catch (error) {
    console.error('Error in getCustomerOrders:', error);
    throw error;
  }
}