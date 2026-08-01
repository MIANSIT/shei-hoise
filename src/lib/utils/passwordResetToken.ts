import crypto from "crypto";

/**
 * Generates a password-reset token pair: a raw token to email to the user
 * (never stored) and its SHA-256 hash to store in `password_reset_tokens`.
 * Mirrors the encrypt-at-rest caution in encryption.ts — the raw value that
 * grants access is never persisted, only a one-way hash of it.
 */
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
