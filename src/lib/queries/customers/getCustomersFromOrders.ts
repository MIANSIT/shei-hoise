// lib/queries/customers/getCustomersFromOrders.ts
import { supabase } from "@/lib/supabase";
import { TableCustomer } from "@/lib/types/users";

// Define proper types for user profile
interface UserProfile {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

// Define types for the order data structure
interface OrderUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  user_type: string;
  user_profiles: UserProfile[] | null;
}

interface OrderData {
  customer_id: string;
  created_at: string;
  users: OrderUser[]; // users is an array from Supabase
}

interface CustomerMapData {
  customer: OrderUser;
  order_count: number;
  last_order_date: string;
}

// Helper function to format address from user_profiles
function formatAddress(
  userProfile: UserProfile | null | undefined
): string | null {
  if (!userProfile) {
    console.log("No userProfile provided to formatAddress");
    return null;
  }

  console.log("Raw userProfile in formatAddress:", userProfile);

  const { address_line_1, address_line_2, city, state, postal_code, country } =
    userProfile;

  const addressParts: string[] = [];

  if (address_line_1) addressParts.push(address_line_1);
  if (address_line_2) addressParts.push(address_line_2);
  if (city) addressParts.push(city);
  if (state) addressParts.push(state);
  if (postal_code) addressParts.push(postal_code);
  if (country) addressParts.push(country);

  const result = addressParts.length > 0 ? addressParts.join(", ") : null;
  console.log("Formatted address result:", result);

  return result;
}

export async function getCustomersFromOrders(
  storeId: string
): Promise<TableCustomer[]> {
  try {
    console.log("Fetching customers from orders for store:", storeId);

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        customer_id,
        created_at,
        users!inner(
          id,
          email,
          first_name,
          last_name,
          phone,
          user_type,
          user_profiles (
            address_line_1,
            address_line_2,
            city,
            state,
            postal_code,
            country
          )
        )
      `
      )
      .eq("store_id", storeId)
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Orders customer query error:", ordersError);
      throw ordersError;
    }

    const customerMap = new Map<string, CustomerMapData>();

    // Use type assertion to handle the Supabase response
    const orders = ordersData as unknown as OrderData[];

    orders?.forEach((order) => {
      // Since users is an array from Supabase, take the first user
      const user = order.users?.[0];
      if (order.customer_id && user) {
        const customerId = order.customer_id;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer: user,
            order_count: 0,
            last_order_date: order.created_at,
          });
        }

        const customerData = customerMap.get(customerId);
        if (customerData) {
          customerData.order_count += 1;

          if (
            new Date(order.created_at) > new Date(customerData.last_order_date)
          ) {
            customerData.last_order_date = order.created_at;
          }
        }
      }
    });

    const customers: TableCustomer[] = Array.from(customerMap.values()).map(
      ({ customer, order_count, last_order_date }) => {
        // Handle user_profiles array - take the first one or null
        const userProfile = Array.isArray(customer.user_profiles)
          ? customer.user_profiles[0] || null
          : customer.user_profiles;

        // Format address from user_profiles
        const address = formatAddress(userProfile as UserProfile | null);

        console.log(
          `Order Customer: ${customer.first_name} ${customer.last_name}`,
          {
            userProfile,
            formattedAddress: address,
          }
        );

        return {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          phone: customer.phone || undefined,
          status: "active" as const,
          order_count,
          last_order_date,
          source: "orders" as const,
          address: address || undefined,
        };
      }
    );

    console.log(`Found ${customers.length} customers from orders`);
    return customers;
  } catch (error) {
    console.error("Unexpected error in orders customer query:", error);
    throw error;
  }
}
