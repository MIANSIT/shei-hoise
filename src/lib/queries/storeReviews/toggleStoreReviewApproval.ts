"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export type ToggleStoreReviewApprovalResult =
  | { success: true }
  | { success: false; error: string };

async function toggleStoreReviewApprovalInternal(
  reviewId: string,
  isApproved: boolean,
): Promise<void> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  // reviewId is caller-supplied — confirm it belongs to the caller's store
  // before flipping visibility.
  const { data: review, error: lookupError } = await supabaseAdmin
    .from("store_reviews")
    .select("id, store_id")
    .eq("id", reviewId)
    .single();

  if (lookupError || !review) throw new Error("Review not found");
  if (review.store_id !== storeResult.storeId) {
    throw new Error("You do not have permission to modify this review");
  }

  const { error } = await supabaseAdmin
    .from("store_reviews")
    .update({ is_approved: isApproved })
    .eq("id", reviewId);
  if (error) throw new Error(error.message);
}

export async function toggleStoreReviewApproval(
  reviewId: string,
  isApproved: boolean,
): Promise<ToggleStoreReviewApprovalResult> {
  try {
    await toggleStoreReviewApprovalInternal(reviewId, isApproved);
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to update review.";
    return { success: false, error };
  }
}
