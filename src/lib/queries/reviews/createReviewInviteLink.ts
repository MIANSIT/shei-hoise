"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { generateReviewInviteToken } from "@/lib/utils/reviewInviteToken";

export type CreateReviewInviteLinkResult =
  | { success: true; url: string }
  | { success: false; error: string };

const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — plenty of time for a customer to act on a shared link.

async function createReviewInviteLinkInternal(
  orderId: string,
  productId: string,
): Promise<string> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, store_id, status")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error("Order not found");
  if (order.store_id !== storeResult.storeId) {
    throw new Error("You do not have permission to share this order");
  }
  if (order.status !== "delivered") {
    throw new Error("Only delivered orders can be shared for review");
  }

  const { data: item } = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!item) throw new Error("This product wasn't part of that order");

  const [{ data: store }, { data: product }] = await Promise.all([
    supabaseAdmin.from("stores").select("store_slug").eq("id", storeResult.storeId).single(),
    supabaseAdmin.from("products").select("slug").eq("id", productId).single(),
  ]);
  if (!store || !product) throw new Error("Store or product not found");

  // Always mints a fresh token rather than trying to reuse an existing one
  // — only the hash is stored, so a prior raw token can't be recovered to
  // re-display anyway. Harmless if a vendor clicks this more than once: the
  // review's own (product_id, customer_id) unique constraint still blocks
  // a second real submission regardless of which valid link gets used.
  const { rawToken, tokenHash } = generateReviewInviteToken();
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();

  const { error: insertError } = await supabaseAdmin.from("review_invite_tokens").insert({
    order_id: orderId,
    product_id: productId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (insertError) throw new Error(insertError.message);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl}/${store.store_slug}/review/${rawToken}`;
}

export async function createReviewInviteLink(
  orderId: string,
  productId: string,
): Promise<CreateReviewInviteLinkResult> {
  try {
    const url = await createReviewInviteLinkInternal(orderId, productId);
    return { success: true, url };
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Failed to create review link. Please try again.";
    return { success: false, error };
  }
}
