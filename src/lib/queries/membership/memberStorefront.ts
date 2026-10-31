"use server";

import { computeMemberDiscount } from "./memberDiscountCore";
import { resolveStorefrontMemberId } from "./memberStorefrontCore";
import { membershipFeatureEnabled } from "./membershipFeature";
import type { MemberDiscountLine } from "./membershipTypes";

const MAX_LINES = 100;

/** What the checkout page shows about the member discount while the shopper fills in the form. */
export interface StorefrontMemberPreview {
  applied: boolean;
  /** Whole taka, rounded down. */
  discount: number;
  memberNumber: string | null;
  planName: string | null;
}

const NOT_APPLIED: StorefrontMemberPreview = { applied: false, discount: 0, memberNumber: null, planName: null };

/**
 * Whether this store offers memberships at all (its plan includes them). The checkout page only
 * shows the "Have a membership number?" box when it does.
 */
export async function isMembershipEnabled(storeId: string): Promise<boolean> {
  try {
    return storeId ? await membershipFeatureEnabled(storeId) : false;
  } catch {
    return false;
  }
}

/**
 * The member discount a shopper would get on their cart, for the live preview at
 * checkout. A shopper counts as a member only when verified (signed in, or a
 * membership number together with the phone number saved on it), and a wrong
 * number or phone gets the same plain "not applied" answer, so this can't be used
 * to find out which numbers exist. The order is checked again when it is placed.
 * @param storeId - The store being shopped at
 * @param input - The number the shopper typed, the phone they gave, and their cart lines
 */
export async function previewStorefrontMemberDiscount(
  storeId: string,
  input: { membershipNumber?: string; phone?: string; lines: MemberDiscountLine[] },
): Promise<StorefrontMemberPreview> {
  try {
    if (!storeId || input.lines.length === 0 || input.lines.length > MAX_LINES) return NOT_APPLIED;
    const lines = input.lines.filter(
      (l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0 && Number.isFinite(l.unitPrice) && l.unitPrice >= 0,
    );
    if (lines.length === 0) return NOT_APPLIED;

    const memberId = await resolveStorefrontMemberId(storeId, {
      membershipNumber: input.membershipNumber,
      phone: input.phone,
    });
    if (!memberId) return NOT_APPLIED;

    const result = await computeMemberDiscount(storeId, memberId, lines);
    if (!result.membership || result.discount <= 0) return NOT_APPLIED;
    return {
      applied: true,
      discount: result.discount,
      memberNumber: result.membership.number,
      planName: result.membership.planName,
    };
  } catch (error) {
    console.error("previewStorefrontMemberDiscount failed:", error);
    return NOT_APPLIED;
  }
}
