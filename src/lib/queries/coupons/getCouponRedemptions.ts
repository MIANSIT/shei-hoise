import { supabase } from "@/lib/supabase";

export interface CouponRedemptionRow {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  totalAmount: number | null;
  status: string | null;
  discountAmount: number;
  createdAt: string;
}

interface RawRedemptionRow {
  id: string;
  order_id: string;
  discount_amount: number;
  created_at: string;
}

interface RawOrderRow {
  id: string;
  order_number: string | null;
  total_amount: number | null;
  status: string | null;
  // customer_name lives inside shipping_address (JSON), not as its own
  // column — see the shippingAddress object built in orderService.ts.
  // PostgREST's ->> operator aliases the extracted field to this last
  // path segment, same pattern as getCustomerOrderHistory.ts.
  customer_name: string | null;
}

/**
 * Orders that redeemed a given coupon — the drill-down behind the coupon
 * table's usage count, so a store owner can see which orders, not just how
 * many. Scoped to storeId even though couponId already implies it, matching
 * the RLS policy shape on coupon_redemptions.
 *
 * Fetches redemptions and orders as two flat queries rather than a nested
 * PostgREST embed (coupon_redemptions -> orders): embeds depend on
 * PostgREST's relationship schema cache picking up the order_id FK, which
 * isn't guaranteed right after a migration without an explicit reload, and
 * a failed embed here silently degrades to "no data" rather than an error
 * the owner would notice.
 */
export async function getCouponRedemptions(
  couponId: string,
  storeId: string,
): Promise<CouponRedemptionRow[]> {
  const { data: redemptions, error } = await supabase
    .from("coupon_redemptions")
    .select("id, order_id, discount_amount, created_at")
    .eq("coupon_id", couponId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching coupon redemptions:", error.message);
    return [];
  }

  const rows = (redemptions as RawRedemptionRow[]) ?? [];
  if (rows.length === 0) return [];

  const orderIds = rows.map((row) => row.order_id);
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, status, shipping_address->>customer_name")
    .in("id", orderIds);

  if (ordersError) {
    console.error("Error fetching orders for coupon redemptions:", ordersError.message);
  }

  const orderById = new Map(
    ((orders as RawOrderRow[]) ?? []).map((order) => [order.id, order]),
  );

  return rows.map((row) => {
    const order = orderById.get(row.order_id);
    return {
      id: row.id,
      orderId: row.order_id,
      orderNumber: order?.order_number ?? null,
      customerName: order?.customer_name ?? null,
      totalAmount: order?.total_amount ?? null,
      status: order?.status ?? null,
      discountAmount: row.discount_amount,
      createdAt: row.created_at,
    };
  });
}
