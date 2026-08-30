"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerId } from "@/lib/utils/getAuthenticatedCustomerId";
import { hashReviewInviteToken } from "@/lib/utils/reviewInviteToken";

export type LinkReviewInviteOrderResult =
  | { success: true; storeSlug: string; productSlug: string }
  | { success: false; reason: "not_found" | "expired" | "claimed_by_other" | "unauthorized" };

interface InviteRow {
  id: string;
  order_id: string;
  product_id: string;
  expires_at: string;
}

interface OrderRow {
  id: string;
  customer_id: string | null;
  store_id: string;
}

async function linkReviewInviteOrderInternal(
  token: string,
): Promise<LinkReviewInviteOrderResult> {
  const customerResult = await getAuthenticatedCustomerId();
  if (!customerResult.ok) return { success: false, reason: "unauthorized" };
  const customerId = customerResult.customerId;

  const tokenHash = hashReviewInviteToken(token);
  const { data: inviteData, error: inviteError } = await supabaseAdmin
    .from("review_invite_tokens")
    .select("id, order_id, product_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (inviteError) throw new Error(inviteError.message);

  const invite = inviteData as InviteRow | null;
  if (!invite) return { success: false, reason: "not_found" };
  if (new Date(invite.expires_at) < new Date()) return { success: false, reason: "expired" };

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id, store_id")
    .eq("id", invite.order_id)
    .single();
  if (orderError || !orderData) return { success: false, reason: "not_found" };

  const order = orderData as OrderRow;

  // The order already belongs to a different real account — a token isn't
  // authorization to hijack someone else's order, so this link just can't
  // be used by this visitor.
  if (order.customer_id && order.customer_id !== customerId) {
    return { success: false, reason: "claimed_by_other" };
  }

  if (!order.customer_id) {
    const { error: linkError } = await supabaseAdmin
      .from("orders")
      .update({ customer_id: customerId })
      .eq("id", order.id)
      .is("customer_id", null); // only claim if still unclaimed — avoids a race with another claim
    if (linkError) throw new Error(linkError.message);
  }

  const [{ data: store }, { data: product }] = await Promise.all([
    supabaseAdmin.from("stores").select("store_slug").eq("id", order.store_id).single(),
    supabaseAdmin.from("products").select("slug").eq("id", invite.product_id).single(),
  ]);
  if (!store || !product) return { success: false, reason: "not_found" };

  return { success: true, storeSlug: store.store_slug, productSlug: product.slug };
}

/** Authenticated. Claims the invite's order for the current customer (if unclaimed), then hands back where to send them to actually leave the review. */
export async function linkReviewInviteOrder(token: string): Promise<LinkReviewInviteOrderResult> {
  try {
    return await linkReviewInviteOrderInternal(token);
  } catch {
    return { success: false, reason: "not_found" };
  }
}
