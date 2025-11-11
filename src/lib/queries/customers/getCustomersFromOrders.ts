// lib/queries/customers/getCustomersFromOrders.ts
import { supabase } from "@/lib/supabase";
import { TableCustomer } from "@/lib/types/users";

interface UserProfile {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export async function getCustomersFromOrders(
  storeId: string
): Promise<TableCustomer[]> {
  try {
    console.log("Fetching customers from orders for store:", storeId);

    // Step 1: Get all orders with customer_id (excluding null) for this store
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, customer_id, created_at, status")
      .eq("store_id", storeId)
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      throw ordersError;
    }

    console.log(`Found ${orders?.length || 0} orders with customer IDs`);

    if (!orders || orders.length === 0) {
      console.log("No orders with customer IDs found");
      return [];
    }

    // Step 2: Get unique customer IDs from orders
    const customerIds = [
      ...new Set(orders.map((order) => order.customer_id).filter(Boolean)),
    ];
    console.log(`Unique customer IDs from orders:`, customerIds);
    console.log(`Number of unique customer IDs: ${customerIds.length}`);

    // Step 3: Fetch customer details for these IDs - NO filters on user_type or store_id
    const { data: customers, error: customersError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        phone,
        user_profiles (
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        )
      `
      )
      .in("id", customerIds);
    // Removed: .eq("store_id", storeId) and .eq("user_type", "customer")

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      throw customersError;
    }

    console.log(`Found ${customers?.length || 0} customer records`);

    // Step 4: Calculate order statistics for each customer
    const customerStats = new Map();

    orders.forEach((order) => {
      if (order.customer_id) {
        if (!customerStats.has(order.customer_id)) {
          customerStats.set(order.customer_id, {
            order_count: 0,
            last_order_date: order.created_at,
            status: order.status,
          });
        }
        const stats = customerStats.get(order.customer_id);
        stats.order_count += 1;

        // Update last order date if this order is more recent
        if (new Date(order.created_at) > new Date(stats.last_order_date)) {
          stats.last_order_date = order.created_at;
        }
      }
    });

    console.log(
      `Customer stats calculated for ${customerStats.size} customers`
    );

    // Step 5: Combine customer data with order statistics
    const tableCustomers: TableCustomer[] = (customers || []).map(
      (customer) => {
        const userProfile = Array.isArray(customer.user_profiles)
          ? customer.user_profiles[0] || null
          : customer.user_profiles;

        const address = formatAddress(userProfile);
        const stats = customerStats.get(customer.id) || {
          order_count: 0,
          last_order_date: null,
          status: "pending",
        };

        return {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`.trim(),
          email: customer.email,
          phone: customer.phone || undefined,
          status:
            stats.order_count > 0 ? ("active" as const) : ("inactive" as const),
          order_count: stats.order_count,
          last_order_date: stats.last_order_date,
          source: "orders" as const,
          address: address || undefined,
        };
      }
    );

    console.log(`Returning ${tableCustomers.length} customers from orders`);

    // Debug: Log the actual customer details found
    console.log(
      "Actual customer details found:",
      tableCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        order_count: c.order_count,
      }))
    );

    return tableCustomers;
  } catch (error) {
    console.error("Unexpected error in orders customer query:", error);
    throw error;
  }
}

function formatAddress(
  userProfile: UserProfile | null | undefined
): string | null {
  if (!userProfile) return null;

  const { address_line_1, address_line_2, city, state, postal_code, country } =
    userProfile;
  const addressParts: string[] = [];

  if (address_line_1) addressParts.push(address_line_1);
  if (address_line_2) addressParts.push(address_line_2);
  if (city) addressParts.push(city);
  if (state) addressParts.push(state);
  if (postal_code) addressParts.push(postal_code);
  if (country) addressParts.push(country);

  return addressParts.length > 0 ? addressParts.join(", ") : null;
}
