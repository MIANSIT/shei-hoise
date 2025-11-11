// lib/queries/customers/getAllStoreCustomers.ts
import { StoreCustomer } from "./getStoreCustomersSimple";
import { TableCustomer } from "@/lib/types/users";
import { getCustomersFromOrders } from "./getCustomersFromOrders";
import { getStoreCustomersSimple } from "./getStoreCustomersSimple";

export async function getAllStoreCustomers(
  storeId: string
): Promise<TableCustomer[]> {
  try {
    if (!storeId) {
      throw new Error("Store ID is required");
    }

    console.log("Fetching all customers for store:", storeId);

    const [directCustomers, orderCustomers] = await Promise.all([
      getStoreCustomersSimple(storeId),
      getCustomersFromOrders(storeId),
    ]);

    const customerMap = new Map<string, TableCustomer>();

    // Convert direct customers to TableCustomer format
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
      } else {
        // Add new customer from orders
        customerMap.set(orderCustomer.id, orderCustomer);
      }
    });

    const allCustomers = Array.from(customerMap.values());

    console.log(
      `Total customers: ${allCustomers.length} (${directCustomers.length} direct, ${orderCustomers.length} from orders)`
    );

    return allCustomers;
  } catch (error) {
    console.error("Error fetching all customers:", error);
    throw error;
  }
}