import { randomInt } from "crypto";

/**
 * A short, unambiguous random token (excludes look-alike characters like
 * 0/O, 1/l/I) — used for the "Generate Order Link" share token.
 *
 * Uses Node's crypto.randomInt (cryptographically secure, no modulo bias)
 * rather than Math.random(), which isn't a CSPRNG and is theoretically
 * predictable — this is only ever called from a server-side API route, so
 * Node's crypto module is always available where this runs.
 */
export function generateShortToken(length = 7): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(randomInt(chars.length));
  }
  return token;
}
