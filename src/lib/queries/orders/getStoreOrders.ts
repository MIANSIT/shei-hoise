import { supabase } from "@/lib/supabase";
import { StoreOrder as StoreOrderType } from "@/lib/types/order";

export interface GetStoreOrdersOptions {
  storeId: string;
  search?: string;
  page?: number; // Make optional
  pageSize?: number; // Make optional
  filters?: {
    status?: string;
    payment_status?: string;
  };
}

export type StoreOrder = StoreOrderType;

export async function getStoreOrders(
  storeId: string,
  search?: string,
  page?: number,
  pageSize?: number,
  filters?: GetStoreOrdersOptions["filters"]
): Promise<{ orders: StoreOrder[]; total: number }> {
  try {
    console.log("📊 Original getStoreOrders called with:", {
      storeId,
      search,
      page,
      pageSize,
      filters,
    });

    const searchTerm = (search || "").trim();

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
      `,
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    // IMPORTANT: Only apply filters if ALL parameters are provided
    if (searchTerm) query = query.ilike("order_number", `%${searchTerm}%`);
    if (filters) {
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.payment_status)
        query = query.eq("payment_status", filters.payment_status);
    }

    // IMPORTANT: For wrapper function, we want ALL orders
    // So if page/pageSize are undefined, DON'T apply range
    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      console.log("📄 Applying pagination range:", { from, to });
    } else {
      console.log("📄 No pagination applied - fetching ALL");
    }

    const { data: orders, error, count } = await query;

    if (error) throw error;

    console.log("✅ Supabase returned:", {
      count: orders?.length || 0,
      totalCount: count,
    });

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

    return {
      orders: transformedOrders,
      total: count || 0,
    };
  } catch (error) {
    console.error("💥 Error in getStoreOrders:", error);
    throw error;
  }
}
