import crypto from "crypto";

/** A random, URL-safe secret for a store to paste into its own Pathao webhook config. */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}
