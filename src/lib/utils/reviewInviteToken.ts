import crypto from "crypto";

/**
 * Generates a review-invite token pair: a raw token to put in the shareable
 * link (never stored) and its SHA-256 hash to store in
 * review_invite_tokens. Same one-way-hash caution as passwordResetToken.ts.
 */
export function generateReviewInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashReviewInviteToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
