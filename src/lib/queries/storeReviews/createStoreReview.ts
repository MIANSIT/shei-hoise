"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerId } from "@/lib/utils/getAuthenticatedCustomerId";
import { storeReviewSchema, StoreReviewFormType } from "@/lib/schema/storeReviewSchema";

export type CreateStoreReviewResult =
  | { success: true }
  | { success: false; error: string };

async function createStoreReviewInternal(data: StoreReviewFormType): Promise<void> {
  const parsed = storeReviewSchema.parse(data);

  const customerResult = await getAuthenticatedCustomerId();
  if (!customerResult.ok) throw new Error(customerResult.error);
  const customer_id = customerResult.customerId;

  // order_id is caller-supplied and optional — a purchase isn't required to
  // review the store at all, but re-verify it server-side (rather than
  // trusting the client) before honoring a claimed "Verified Purchase"
  // badge. Mirrors createReview.ts's order re-check.
  let verifiedOrderId: string | null = null;
  if (parsed.order_id) {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, store_id, customer_id, status, shipping_address->>phone")
      .eq("id", parsed.order_id)
      .single();
    if (orderError || !order) throw new Error("Order not found");
    if (order.store_id !== parsed.store_id) throw new Error("Order not found");

    let ownsOrder = order.customer_id === customer_id;
    if (!ownsOrder) {
      const { data: customer } = await supabaseAdmin
        .from("store_customers")
        .select("phone")
        .eq("id", customer_id)
        .maybeSingle();
      const orderPhone = (order as { phone: string | null }).phone;
      ownsOrder = !!customer?.phone && !!orderPhone && customer.phone === orderPhone;
    }

    if (ownsOrder && order.status === "delivered") {
      verifiedOrderId = parsed.order_id;
    }
    // An order_id that doesn't check out just means no verified badge —
    // reviewing itself doesn't require one, so this isn't fatal.
  }

  // The four category ratings (and the overall they average into) require a
  // verified purchase — discard whatever the client sent unless
  // verifiedOrderId actually resolved above, so a non-buyer can't move the
  // store's average by posting ratings alongside a comment.
  const categoryRatings = verifiedOrderId
    ? {
        product_quality_rating: parsed.product_quality_rating ?? null,
        delivery_rating: parsed.delivery_rating ?? null,
        service_rating: parsed.service_rating ?? null,
        value_rating: parsed.value_rating ?? null,
      }
    : {
        product_quality_rating: null,
        delivery_rating: null,
        service_rating: null,
        value_rating: null,
      };

  if (verifiedOrderId && categoryRatings.product_quality_rating === null) {
    throw new Error("Rate all four categories");
  }

  const rating = verifiedOrderId
    ? Math.round(
        ((categoryRatings.product_quality_rating ?? 0) +
          (categoryRatings.delivery_rating ?? 0) +
          (categoryRatings.service_rating ?? 0) +
          (categoryRatings.value_rating ?? 0)) /
          4,
      )
    : null;

  const { error: insertError } = await supabaseAdmin.from("store_reviews").insert({
    store_id: parsed.store_id,
    customer_id,
    order_id: verifiedOrderId,
    rating,
    ...categoryRatings,
    review_title: parsed.review_title || null,
    review_text: parsed.review_text,
    is_verified_purchase: !!verifiedOrderId,
  });

  if (insertError) {
    // store_reviews_store_id_customer_id_key
    if (insertError.code === "23505") {
      throw new Error("You've already reviewed this store");
    }
    throw new Error(insertError.message);
  }
}

export async function createStoreReview(
  data: StoreReviewFormType,
): Promise<CreateStoreReviewResult> {
  try {
    await createStoreReviewInternal(data);
    return { success: true };
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to submit review. Please try again.";
    return { success: false, error };
  }
}
