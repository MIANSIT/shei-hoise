import crypto from "crypto";

/**
 * Verifies an inbound foodpanda webhook.
 *
 * foodpanda secures a webhook in ONE of two modes, set per chain in the
 * Partner Portal's Shops Integrations plugin:
 *
 *   'static' — STATIC_TOKEN. The configured token is sent in the Authorization
 *              header. The portal allows "any string", or a Basic auth header,
 *              so all three shapes are accepted below.
 *   'hmac'   — HMAC_SIGNATURE. X-DH-Signature carries
 *              HMAC-SHA256(raw request body) as 64 lowercase hex characters,
 *              keyed by the UTF-8 bytes of the signing secret. No timestamp
 *              and no replay window — the signature covers the body only.
 *
 * Verified against foodpanda's own published test vector; see the unit check
 * in this file's sibling test. Both comparisons are constant-time.
 *
 * The body MUST be the raw, unparsed bytes. Parsing and re-serialising JSON
 * changes whitespace, key order and escaping, which produces a different
 * signature — so callers read the body as text and pass that exact string.
 */

export type FoodpandaWebhookAuthType = "static" | "hmac";

export interface FoodpandaVerifyInput {
  authType: FoodpandaWebhookAuthType;
  /** The decrypted secret for THIS webhook (order or catalog). */
  secret: string;
  /** Raw, unparsed request body exactly as received. */
  rawBody: string;
  /** Value of the X-DH-Signature header, if present. */
  signatureHeader: string | null;
  /** Value of the Authorization header, if present. */
  authorizationHeader: string | null;
}

export interface FoodpandaVerifyResult {
  valid: boolean;
  /** Why it failed — for server logs only, never echoed to the caller. */
  reason?: string;
}

/** Length-safe constant-time compare; differing lengths are never equal. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyHmac(input: FoodpandaVerifyInput): FoodpandaVerifyResult {
  const received = input.signatureHeader?.trim();
  if (!received) return { valid: false, reason: "missing X-DH-Signature header" };

  // The spec is explicit: exactly 64 lowercase hex characters. Rejecting
  // anything else keeps malformed or prefixed values from reaching the compare.
  if (!/^[0-9a-f]{64}$/.test(received)) {
    return { valid: false, reason: "malformed X-DH-Signature (expected 64 lowercase hex chars)" };
  }

  const expected = crypto
    .createHmac("sha256", Buffer.from(input.secret, "utf8"))
    .update(Buffer.from(input.rawBody, "utf8"))
    .digest("hex");

  return safeEqual(expected, received)
    ? { valid: true }
    : { valid: false, reason: "signature mismatch" };
}

function verifyStatic(input: FoodpandaVerifyInput): FoodpandaVerifyResult {
  const header = input.authorizationHeader?.trim();
  if (!header) return { valid: false, reason: "missing Authorization header" };

  // 1. The token sent bare, which is what the portal produces for a plain
  //    string secret.
  if (safeEqual(header, input.secret)) return { valid: true };

  // 2. "Bearer <token>" — accepted because some portal configurations prefix it.
  if (header.startsWith("Bearer ") && safeEqual(header.slice(7).trim(), input.secret)) {
    return { valid: true };
  }

  // 3. "Basic base64(user:password)" — the portal documents this shape too.
  //    The secret may be configured as the whole header value, the base64
  //    blob, or just the password.
  if (header.startsWith("Basic ")) {
    const encoded = header.slice(6).trim();
    if (safeEqual(encoded, input.secret)) return { valid: true };
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (decoded.includes(":") && safeEqual(password, input.secret)) return { valid: true };
    } catch {
      // Undecodable base64 is simply not a match.
    }
  }

  return { valid: false, reason: "static token mismatch" };
}

export function verifyFoodpandaWebhook(input: FoodpandaVerifyInput): FoodpandaVerifyResult {
  if (!input.secret) {
    // An account with no secret stored must fail closed. Accepting unsigned
    // webhooks would let anyone who learns the URL inject orders.
    return { valid: false, reason: "no webhook secret configured for this account" };
  }
  return input.authType === "hmac" ? verifyHmac(input) : verifyStatic(input);
}
