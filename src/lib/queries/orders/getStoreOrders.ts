import { supabase } from "@/lib/supabase";
import { StoreOrder } from "@/lib/types/order";

export async function getStoreOrders(storeId: string): Promise<StoreOrder[]> {
  try {
    console.log('🔄 Fetching orders for store:', storeId);
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        store_customers!customer_id (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', {
        message: error.message,
        details: error.details,
        code: error.code,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ Found ${orders?.length || 0} orders for store`);

    // Transform the data to match StoreOrder type
    const transformedOrders: StoreOrder[] = (orders || []).map(order => {
      // Handle the store_customers relationship
      const customerData = order.store_customers;
      let customer = null;

      if (customerData) {
        // Handle case where store_customers might be an array
        const customerObj = Array.isArray(customerData) ? customerData[0] : customerData;
        
        customer = {
          id: customerObj.id,
          first_name: customerObj.name || 'Unknown Customer', // Map name to first_name for compatibility
          email: customerObj.email || '',
          phone: customerObj.phone || null
        };
      }

      return {
        ...order,
        customers: customer,
        // Ensure all required fields are present
        shipping_address: order.shipping_address || {
          customer_name: '',
          phone: '',
          address_line_1: '',
          city: '',
          country: ''
        },
        billing_address: order.billing_address || null,
        order_items: order.order_items || []
      };
    });

    return transformedOrders;
  } catch (error) {
    console.error('💥 Error in getStoreOrders:', error);
    throw error;
  }
}