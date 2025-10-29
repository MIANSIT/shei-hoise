import { supabase } from "@/lib/supabase";
import { StoreOrder } from "@/lib/types/order";

export async function getStoreOrders(storeId: string): Promise<StoreOrder[]> {
  try {
    console.log('Fetching orders for store:', storeId);
    
    const { data: orders, error } = await supabase
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
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    console.log(`Found ${orders?.length || 0} orders for store`);
    return orders || [];
  } catch (error) {
    console.error('Error in getStoreOrders:', error);
    throw error;
  }
}