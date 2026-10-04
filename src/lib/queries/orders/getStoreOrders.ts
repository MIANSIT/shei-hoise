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
    channel?: "online" | "pos";
    /** Stores with branches: only orders of these branches (the switcher, or a staff member's branches). */
    branchIds?: string[];
    /** Only orders waiting for a person to confirm or fix their branch. */
    needsBranch?: boolean;
    /** "no" = invoice not printed yet, "yes" = already printed. */
    printed?: "yes" | "no";
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
  totalByChannel: { online: number; pos: number };
  /** Orders whose invoice isn't printed yet (same branch scope); null if unknown. */
  totalNotPrinted: number | null;
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

    // Branch scope applies to the list AND the tab counts, so the numbers on
    // the tabs describe the branch being looked at. Only added when branches
    // are in use, so stores without them never reference the new columns.
    const branchIds = filters?.branchIds?.filter(Boolean) ?? [];
    if (branchIds.length > 0) query = query.in("branch_id", branchIds);
    if (filters?.needsBranch) {
      query = query.or("branch_confirmed.eq.false,needs_transfer.eq.true");
    }
    // Only added when asked for, so databases without the column still work.
    if (filters?.printed === "no") query = query.is("invoice_printed_at", null);
    if (filters?.printed === "yes") query = query.not("invoice_printed_at", "is", null);

    if (filters) {
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.payment_status)
        query = query.eq("payment_status", filters.payment_status);
      if (filters.channel) query = query.eq("channel", filters.channel);
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
    // what's currently being searched for. Uses exact head-only counts
    // (COUNT(*) computed in Postgres, no rows returned) rather than fetching
    // every row and tallying in JS — a plain unpaginated .select() is capped
    // at PGRST_DB_MAX_ROWS (1000, see docker-compose.yml), which silently
    // undercounted stores once they passed that many orders.
    const orderStatusValues = Object.values(OrderStatus);
    const paymentStatusValues = Object.values(PaymentStatus);
    const countOrders = (column?: string, value?: string) => {
      let q = supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", storeId);
      if (column && value) q = q.eq(column, value);
      if (branchIds.length > 0) q = q.in("branch_id", branchIds);
      // Tab counts follow the printed filter, so "Confirmed (10)" means 10 to print.
      if (filters?.printed === "no") q = q.is("invoice_printed_at", null);
      if (filters?.printed === "yes") q = q.not("invoice_printed_at", "is", null);
      return q;
    };

    const [totalOrdersResult, onlineChannelResult, posChannelResult, ...statusCountResults] =
      await Promise.all([
        countOrders(),
        countOrders("channel", "online"),
        countOrders("channel", "pos"),
        ...orderStatusValues.map((status) => countOrders("status", status)),
        ...paymentStatusValues.map((paymentStatus) => countOrders("payment_status", paymentStatus)),
      ]);

    const statusError =
      totalOrdersResult.error ||
      onlineChannelResult.error ||
      posChannelResult.error ||
      statusCountResults.find((r) => r.error)?.error ||
      null;
    if (statusError) throw statusError;

    const totalByChannel = {
      online: onlineChannelResult.count || 0,
      pos: posChannelResult.count || 0,
    };

    // Separate and error-tolerant: before the invoice_printed_at migration
    // this just reports null instead of failing the whole list.
    let notPrintedQuery = supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .is("invoice_printed_at", null)
      .not("status", "in", "(cancelled,returned)");
    if (branchIds.length > 0) notPrintedQuery = notPrintedQuery.in("branch_id", branchIds);
    const notPrintedResult = await notPrintedQuery;
    const totalNotPrinted = notPrintedResult.error ? null : (notPrintedResult.count ?? 0);

    const orderStatusCounts = statusCountResults.slice(
      0,
      orderStatusValues.length,
    );
    const paymentStatusCounts = statusCountResults.slice(
      orderStatusValues.length,
    );

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

    // Totals by payment status — each entry backed by its own exact COUNT(*)
    const totalByPaymentStatus = paymentStatusValues.reduce(
      (acc, status, i) => {
        acc[status] = paymentStatusCounts[i].count || 0;
        return acc;
      },
      {} as Record<PaymentStatus, number>,
    );

    // Totals by order status — each entry backed by its own exact COUNT(*)
    const totalByOrderStatus = orderStatusValues.reduce(
      (acc, status, i) => {
        acc[status] = orderStatusCounts[i].count || 0;
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );

    return {
      orders: transformedOrders,
      total: count || 0,
      totalOrders: totalOrdersResult.count || 0,
      totalByPaymentStatus,
      totalByOrderStatus,
      totalByChannel,
      totalNotPrinted,
    };
  } catch (error) {
    console.error("Error in getStoreOrders:", error);
    throw error;
  }
}
