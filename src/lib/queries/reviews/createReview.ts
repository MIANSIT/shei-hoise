"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerId } from "@/lib/utils/getAuthenticatedCustomerId";
import { reviewSchema, ReviewFormType } from "@/lib/schema/reviewSchema";

export type CreateReviewResult =
  | { success: true }
  | { success: false; error: string };

async function createReviewInternal(data: ReviewFormType): Promise<void> {
  const parsed = reviewSchema.parse(data);

  const customerResult = await getAuthenticatedCustomerId();
  if (!customerResult.ok) throw new Error(customerResult.error);
  const customer_id = customerResult.customerId;

  // order_id is caller-supplied and optional — a purchase isn't required to
  // review at all, but re-verify it server-side (rather than trusting the
  // client) before honoring a claimed "Verified Purchase" badge.
  let verifiedOrderId: string | null = null;
  if (parsed.order_id) {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, customer_id, status, shipping_address->>phone")
      .eq("id", parsed.order_id)
      .single();
    if (orderError || !order) throw new Error("Order not found");

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
      const { data: orderItem } = await supabaseAdmin
        .from("order_items")
        .select("id")
        .eq("order_id", parsed.order_id)
        .eq("product_id", parsed.product_id)
        .maybeSingle();
      if (orderItem) verifiedOrderId = parsed.order_id;
    }
    // An order_id that doesn't check out just means no verified badge —
    // reviewing itself doesn't require one, so this isn't fatal.
  }

  // A rating requires a verified purchase — discard whatever the client
  // sent unless verifiedOrderId actually resolved above, so a non-buyer
  // can't move a product's average by posting a rating alongside a comment.
  if (verifiedOrderId && parsed.rating === undefined) {
    throw new Error("Pick a rating");
  }
  const rating = verifiedOrderId ? parsed.rating : null;

  const { error: insertError } = await supabaseAdmin.from("product_reviews").insert({
    product_id: parsed.product_id,
    customer_id,
    order_id: verifiedOrderId,
    rating,
    review_title: parsed.review_title || null,
    review_text: parsed.review_text,
    is_verified_purchase: !!verifiedOrderId,
  });

  if (insertError) {
    // product_reviews_product_id_customer_id_key
    if (insertError.code === "23505") {
      throw new Error("You've already reviewed this product");
    }
    throw new Error(insertError.message);
  }
}

export async function createReview(data: ReviewFormType): Promise<CreateReviewResult> {
  try {
    await createReviewInternal(data);
    return { success: true };
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to submit review. Please try again.";
    return { success: false, error };
  }
}
