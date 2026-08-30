"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerId } from "@/lib/utils/getAuthenticatedCustomerId";

export type ReviewEligibility =
  | { canReview: true; orderId: string | null }
  | { canReview: false; reason: "not_logged_in" | "already_reviewed" };

/**
 * Any logged-in customer may review a product once — a purchase isn't
 * required (a strict verified-only gate would permanently block reviews on
 * any store with no order history yet, which defeats the point of the
 * feature). If a delivered order for this product exists, its id is
 * returned so the review can be tagged "Verified Purchase"; otherwise
 * orderId is null and the review is submitted unverified.
 *
 * Matches orders by customer_id OR shipping phone, not customer_id alone —
 * orders.customer_id is unreliable here (guest checkouts, and orders placed
 * before the account existed, never get linked; see the same reasoning in
 * getCustomerOrderHistory.ts).
 */
export async function getReviewEligibility(
  productId: string,
): Promise<ReviewEligibility> {
  const customerResult = await getAuthenticatedCustomerId();
  if (!customerResult.ok) return { canReview: false, reason: "not_logged_in" };
  const customerId = customerResult.customerId;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("product_reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return { canReview: false, reason: "already_reviewed" };

  const [{ data: product, error: productError }, { data: customer, error: customerError }] =
    await Promise.all([
      supabaseAdmin.from("products").select("store_id").eq("id", productId).maybeSingle(),
      supabaseAdmin.from("store_customers").select("phone").eq("id", customerId).maybeSingle(),
    ]);
  if (productError) throw new Error(productError.message);
  if (customerError) throw new Error(customerError.message);
  if (!product) return { canReview: true, orderId: null };

  const phone = customer?.phone?.replace(/[,()]/g, "").trim();

  let orderQuery = supabaseAdmin
    .from("orders")
    .select("id")
    .eq("store_id", product.store_id)
    .eq("status", "delivered");

  orderQuery = phone
    ? orderQuery.or(`customer_id.eq.${customerId},shipping_address->>phone.eq.${phone}`)
    : orderQuery.eq("customer_id", customerId);

  const { data: orders, error: ordersError } = await orderQuery;
  if (ordersError) throw new Error(ordersError.message);

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return { canReview: true, orderId: null };

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("order_id")
    .eq("product_id", productId)
    .in("order_id", orderIds)
    .limit(1);
  if (itemsError) throw new Error(itemsError.message);

  return { canReview: true, orderId: items?.[0]?.order_id ?? null };
}
