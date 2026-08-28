import crypto from "crypto";

/**
 * Generates a 6-digit onboarding email verification code: a raw code to
 * email to the store owner (never stored) and its SHA-256 hash to store in
 * `onboarding_email_verifications`. Mirrors passwordResetToken.ts's
 * hash-at-rest approach.
 */
export function generateVerificationCode(): { rawCode: string; codeHash: string } {
  const rawCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = hashVerificationCode(rawCode);
  return { rawCode, codeHash };
}

export function hashVerificationCode(rawCode: string): string {
  return crypto.createHash("sha256").update(rawCode).digest("hex");
}
