import { supabase } from "@/lib/supabase";
import { StoreOrder as StoreOrderType } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";

export interface GetStoreOrdersOptions {
  storeId: string;
  search?: string;
  page?: number;
  pageSize?: number;
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
): Promise<{
  orders: StoreOrder[];
  total: number;
  totalOrders: number;
  totalByPaymentStatus: Record<PaymentStatus, number>;
  totalByOrderStatus: Record<OrderStatus, number>;
}> {
  try {
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

    if (searchTerm) query = query.ilike("order_number", `%${searchTerm}%`);
    if (filters) {
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.payment_status)
        query = query.eq("payment_status", filters.payment_status);
    }

    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data: orders, error, count } = await query;
    if (error) throw error;

    // Total orders without filters (all)
    const { count: totalOrders, error: totalError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);

    if (totalError) throw totalError;

    // Totals by payment status
    const totalByPaymentStatus: Record<PaymentStatus, number> = {
      [PaymentStatus.PENDING]: 0,
      [PaymentStatus.PAID]: 0,
      [PaymentStatus.FAILED]: 0,
      [PaymentStatus.REFUNDED]: 0,
    };

    // Totals by order status
    const totalByOrderStatus: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.CONFIRMED]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.DELIVERED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    // Count totals
    const allOrders = orders || [];
    allOrders.forEach((order) => {
      const paymentStatus = order.payment_status as PaymentStatus;
      const orderStatus = order.status as OrderStatus;

      if (paymentStatus && totalByPaymentStatus[paymentStatus] !== undefined) {
        totalByPaymentStatus[paymentStatus]++;
      }

      if (orderStatus && totalByOrderStatus[orderStatus] !== undefined) {
        totalByOrderStatus[orderStatus]++;
      }
    });

    // Transform orders for frontend
    const transformedOrders: StoreOrder[] = allOrders.map((order) => {
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
      totalOrders: totalOrders || 0,
      totalByPaymentStatus,
      totalByOrderStatus,
    };
  } catch (error) {
    console.error("Error in getStoreOrders:", error);
    throw error;
  }
}
