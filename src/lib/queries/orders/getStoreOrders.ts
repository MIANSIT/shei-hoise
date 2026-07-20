import { supabase } from "@/lib/supabase";
import { StoreOrder as StoreOrderType } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { getActiveCourierTrackingByOrderIds } from "@/lib/queries/courier/attachActiveCourierTracking";

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
  filters?: GetStoreOrdersOptions["filters"],
): Promise<{
  orders: StoreOrder[];
  total: number;
  totalOrders: number;
  totalByPaymentStatus: Record<PaymentStatus, number>;
  totalByOrderStatus: Record<OrderStatus, number>;
}> {
  try {
    const searchTerm = (search || "").trim();
    // Sanitize characters that would otherwise break the raw PostgREST
    // .or() filter string (its own field separator/grouping syntax) — order
    // numbers and phone numbers never legitimately contain these.
    const safeSearchTerm = searchTerm.replace(/[,()]/g, "");
    const searchDigits = searchTerm.replace(/\D/g, "");

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (
            id,
            sku,
            weight
          ),
          product_variants (
            id,
            sku,
            weight
          )
        ),
        store_customers!customer_id (
          id,
          name,
          email,
          phone
        )
      `,
        { count: "exact" },
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (safeSearchTerm) {
      // Matches order number directly, plus the shipping address's own phone
      // field, plus (via a customer_id lookup below) the phone on the
      // customer record — mirrors the search that used to run client-side
      // over the entire fetched order history.
      const orConditions = [`order_number.ilike.%${safeSearchTerm}%`];

      if (searchDigits.length >= 3) {
        orConditions.push(`shipping_address->>phone.ilike.%${searchDigits}%`);

        const { data: matchingCustomers } = await supabase
          .from("store_customers")
          .select("id")
          .ilike("phone", `%${searchDigits}%`);

        const customerIds = (matchingCustomers ?? []).map((c) => c.id);
        if (customerIds.length > 0) {
          orConditions.push(`customer_id.in.(${customerIds.join(",")})`);
        }
      }

      query = query.or(orConditions.join(","));
    }

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

    // Store-wide status/payment tallies + total order count — always
    // unfiltered (independent of the current search/status/payment filter
    // above), so status tabs keep showing the full picture regardless of
    // what's currently being searched for. Selecting just these two columns
    // (no joins, no order_items) keeps this cheap even with a large order
    // history — this single query replaces what used to be a full refetch
    // of every order + line item on every page/search/filter change.
    const { data: statusRows, error: statusError } = await supabase
      .from("orders")
      .select("status, payment_status")
      .eq("store_id", storeId);

    if (statusError) throw statusError;

    // courier_consignment_id/courier_order_status/courier_credential_id are no
    // longer native columns on orders — sourced from each order's active
    // courier_tracking row instead (service-role only, hence the server action).
    const trackingByOrderId = await getActiveCourierTrackingByOrderIds(
      (orders || []).map((o) => o.id),
    );

    // Transform orders for frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedOrders: StoreOrder[] = (orders || []).map((order: any) => {
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

      // Transform order items to include product and variant SKUs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderItems = (order.order_items || []).map((item: any) => {
        // Extract product SKU (products is an array due to join)
        const productSku = Array.isArray(item.products)
          ? item.products[0]?.sku || ""
          : item.products?.sku || "";

        // Extract variant SKU (product_variants is an array due to join)
        const variantSku = Array.isArray(item.product_variants)
          ? item.product_variants[0]?.sku || ""
          : item.product_variants?.sku || "";

        // Per-unit weight (kg) — variant's own weight wins when the line has
        // one, since a variant (e.g. a specific size) can weigh differently
        // than the base product record.
        const productWeight = Array.isArray(item.products)
          ? item.products[0]?.weight
          : item.products?.weight;
        const variantWeight = Array.isArray(item.product_variants)
          ? item.product_variants[0]?.weight
          : item.product_variants?.weight;
        const weight = variantWeight ?? productWeight ?? null;

        return {
          ...item,
          product_sku: productSku,
          variant_sku: variantSku,
          weight,
        };
      });

      const tracking = trackingByOrderId[order.id];

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
        order_items: orderItems,
        courier_consignment_id: tracking?.courier_consignment_id ?? null,
        courier_order_status: tracking?.courier_order_status ?? null,
        courier_credential_id: tracking?.courier_credential_id ?? null,
      };
    });

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

    // Count totals from the full (unfiltered) store-wide status/payment rows
    (statusRows ?? []).forEach((row) => {
      const paymentStatus = row.payment_status as PaymentStatus;
      const orderStatus = row.status as OrderStatus;

      if (paymentStatus && totalByPaymentStatus[paymentStatus] !== undefined) {
        totalByPaymentStatus[paymentStatus]++;
      }

      if (orderStatus && totalByOrderStatus[orderStatus] !== undefined) {
        totalByOrderStatus[orderStatus]++;
      }
    });

    return {
      orders: transformedOrders,
      total: count || 0,
      totalOrders: statusRows?.length || 0,
      totalByPaymentStatus,
      totalByOrderStatus,
    };
  } catch (error) {
    console.error("Error in getStoreOrders:", error);
    throw error;
  }
}
