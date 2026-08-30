"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerId } from "@/lib/utils/getAuthenticatedCustomerId";

export type StoreReviewEligibility =
  | { canReview: true; orderId: string | null }
  | { canReview: false; reason: "not_logged_in" | "already_reviewed" };

/**
 * Any logged-in customer may review a store once — mirrors
 * getReviewEligibility.ts's product-level rule. A delivered order for this
 * store (matched by customer_id OR shipping phone, same reasoning as the
 * product version) earns the review a "Verified Purchase" badge; otherwise
 * orderId is null and the review is submitted unverified.
 */
export async function getStoreReviewEligibility(
  storeId: string,
): Promise<StoreReviewEligibility> {
  const customerResult = await getAuthenticatedCustomerId();
  if (!customerResult.ok) return { canReview: false, reason: "not_logged_in" };
  const customerId = customerResult.customerId;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("store_reviews")
    .select("id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return { canReview: false, reason: "already_reviewed" };

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("store_customers")
    .select("phone")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError) throw new Error(customerError.message);

  const phone = customer?.phone?.replace(/[,()]/g, "").trim();

  let orderQuery = supabaseAdmin
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "delivered");

  orderQuery = phone
    ? orderQuery.or(`customer_id.eq.${customerId},shipping_address->>phone.eq.${phone}`)
    : orderQuery.eq("customer_id", customerId);

  const { data: orders, error: ordersError } = await orderQuery.limit(1);
  if (ordersError) throw new Error(ordersError.message);

  return { canReview: true, orderId: orders?.[0]?.id ?? null };
}
