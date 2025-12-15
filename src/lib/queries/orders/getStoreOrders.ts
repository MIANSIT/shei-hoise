import { supabase } from "@/lib/supabase";
import { StoreOrder as StoreOrderType } from "@/lib/types/order";

export interface GetStoreOrdersOptions {
  storeId: string;
  search?: string; // search by order_number
  page?: number; // current page number
  pageSize?: number; // items per page
}
export type StoreOrder = StoreOrderType;
export async function getStoreOrders(
  storeId: string,
  search?: string,
  page = 1,
  pageSize = 10
): Promise<StoreOrder[]> {
  try {
    const searchTerm = (search || "").trim(); // <-- ensure string

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*),
        store_customers!customer_id (
          id,
          name,
          email,
          phone
        )
      `
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (searchTerm) {
      query = query.ilike("order_number", `%${searchTerm}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: orders, error } = await query;

    if (error) throw error;

    // your transformedOrders mapping here (keep exactly as you had)
    const transformedOrders: StoreOrder[] = (orders || []).map((order) => {
      const customerData = order.store_customers;
      let customer = null;

      if (customerData) {
        const customerObj = Array.isArray(customerData)
          ? customerData[0]
          : customerData;

        customer = {
          id: customerObj.id,
          first_name: customerObj.name || "Unknown Customer",
          email: customerObj.email || "",
          phone: customerObj.phone || null,
        };
      }

      return {
        ...order,
        customers: customer,
        shipping_address: order.shipping_address || {
          customer_name: "",
          phone: "",
          address_line_1: "",
          city: "",
          country: "",
        },
        billing_address: order.billing_address || null,
        order_items: order.order_items || [],
      };
    });

    return transformedOrders;
  } catch (error) {
    console.error("💥 Error in getStoreOrders:", error);
    throw error;
  }
}
