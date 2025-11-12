// lib/queries/customers/getAllStoreCustomers.ts
// import { StoreCustomer } from "./getStoreCustomersSimple";
import { DetailedCustomer } from "@/lib/types/users";
import { getCustomersFromOrders } from "./getCustomersFromOrders";
import { getStoreCustomersSimple } from "./getStoreCustomersSimple";

export async function getAllStoreCustomers(
  storeId: string
): Promise<DetailedCustomer[]> {
  try {
    if (!storeId) {
      throw new Error("Store ID is required");
    }

    console.log("Fetching all customers for store:", storeId);

    const [directCustomers, orderCustomers] = await Promise.all([
      getStoreCustomersSimple(storeId),
      getCustomersFromOrders(storeId),
    ]);

    const customerMap = new Map<string, DetailedCustomer>();

    // Convert direct customers to DetailedCustomer format
    directCustomers.forEach((customer) => {
      customerMap.set(customer.id, {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        phone: customer.phone || undefined,
        status: "active",
        order_count: 0,
        source: "direct",
        address: customer.address || undefined,
        // Add DetailedCustomer fields
        first_name: customer.first_name,
        last_name: customer.last_name,
        user_type: customer.user_type,
        profile_details: customer.profile_details || null,
      });
    });

    // Merge with order customers
    orderCustomers.forEach((orderCustomer) => {
      const existingCustomer = customerMap.get(orderCustomer.id);

      if (existingCustomer) {
        // Update existing customer with order data
        existingCustomer.order_count = orderCustomer.order_count;
        existingCustomer.last_order_date = orderCustomer.last_order_date;
        existingCustomer.source = "orders";
        // Keep the existing address if order customer doesn't have one
        if (!existingCustomer.address && orderCustomer.address) {
          existingCustomer.address = orderCustomer.address;
        }
        // Keep profile_details from order customer if it has more data
        if (
          orderCustomer.profile_details &&
          !existingCustomer.profile_details
        ) {
          existingCustomer.profile_details = orderCustomer.profile_details;
        }
      } else {
        // Add new customer from orders as DetailedCustomer
        customerMap.set(orderCustomer.id, {
          ...orderCustomer,
          first_name:
            orderCustomer.first_name ||
            orderCustomer.name?.split(" ")[0] ||
            null,
          last_name:
            orderCustomer.last_name ||
            orderCustomer.name?.split(" ").slice(1).join(" ") ||
            null,
        });
      }
    });

    const allCustomers = Array.from(customerMap.values());

    console.log(
      `Total customers: ${allCustomers.length} (${directCustomers.length} direct, ${orderCustomers.length} from orders)`
    );

    // Debug: Log profile details for first few customers
    allCustomers.slice(0, 3).forEach((customer, index) => {
      console.log(
        `Customer ${index + 1} profile details:`,
        customer.profile_details
      );
    });

    return allCustomers;
  } catch (error) {
    console.error("Error fetching all customers:", error);
    throw error;
  }
}
