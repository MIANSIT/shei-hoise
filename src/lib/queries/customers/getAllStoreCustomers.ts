// lib/queries/customers/getAllStoreCustomers.ts
import { DetailedCustomer } from "@/lib/types/users";
import { getStoreOrders } from "../orders/getStoreOrders";
import { supabase } from "@/lib/supabase";
import { getCustomerProfileByStoreCustomerId } from "./getCustomerProfile";

export async function getAllStoreCustomers(
  storeId: string
): Promise<DetailedCustomer[]> {
  try {
    if (!storeId) {
      throw new Error("Store ID is required");
    }

    console.log("🔄 Getting customers for store:", storeId);

    // Get all orders for THIS STORE ONLY
    const orders = await getStoreOrders(storeId);
    console.log(`✅ Found ${orders.length} orders for store ${storeId}`);

    if (orders.length === 0) {
      console.log("📭 No orders found for this store");
      return [];
    }

    // Extract unique customers from orders
    const customerMap = new Map<string, DetailedCustomer>();
    
    for (const order of orders) {
      if (order.customers && order.customers.id) {
        const customer = order.customers;
        const storeCustomerId = customer.id; // This is the store_customers.id
        
        if (!customerMap.has(storeCustomerId)) {
          console.log(`👤 Processing customer:`, {
            store_customer_id: storeCustomerId,
            name: customer.first_name,
            email: customer.email
          });

          // Try to find the customer profile using store_customer_id
          let profileDetails = null;

          try {
            const profile = await getCustomerProfileByStoreCustomerId(storeCustomerId);
            
            if (profile) {
              profileDetails = {
                date_of_birth: profile.date_of_birth || null,
                gender: profile.gender || null,
                address_line_1: profile.address || null,
                address: profile.address || null,
                address_line_2: null,
                city: profile.city || null,
                state: profile.state || null,
                postal_code: profile.postal_code || null,
                country: profile.country || null,
              };
              console.log(`✅ Found profile for store_customer_id ${storeCustomerId}`);
            } else {
              console.log(`❌ No profile found for store_customer_id: ${storeCustomerId}`);
            }
          } catch (profileError) {
            console.log(`ℹ️ Error fetching profile for customer ${storeCustomerId}:`, profileError);
          }

          // Create customer object
          const customerName = customer.first_name || 'Unknown Customer';
          
          customerMap.set(storeCustomerId, {
            id: storeCustomerId, // This is store_customers.id
            name: customerName,
            email: customer.email || '',
            phone: customer.phone || undefined,
            status: "active" as const,
            order_count: orders.filter(o => o.customers?.id === storeCustomerId).length,
            source: "orders" as const,
            first_name: customer.first_name,
            last_name: '',
            user_type: "customer",
            profile_details: profileDetails, // This contains the actual profile data
            created_at: order.created_at,
            updated_at: order.updated_at,
          });
        }
      }
    }

    const customers = Array.from(customerMap.values());
    console.log(`✅ Returning ${customers.length} unique customers for store ${storeId}`);

    // Log profile summary
    const withProfiles = customers.filter(c => c.profile_details);
    console.log("📊 Profile summary for store:", {
      storeId,
      totalCustomers: customers.length,
      withProfiles: withProfiles.length,
      withoutProfiles: customers.length - withProfiles.length
    });

    return customers;

  } catch (error) {
    console.error("❌ Error getting customers for store:", storeId, error);
    throw error;
  }
}