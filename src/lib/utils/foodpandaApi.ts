// Raw foodpanda / Delivery Hero Partner API sender — no Supabase, no throwing.
// Auth is OAuth2 client_credentials; the token is a short-lived JWT (2h) that
// the docs tell us to cache and re-request on expiry. There is no refresh token.
//
// Spec: https://developer.foodpanda.com/api-specifications (Partner API v2.0.2)

export const FOODPANDA_HOSTS = {
  sandbox: "https://sandbox.partner.deliveryhero.io",
  live: "https://foodpanda.partner.deliveryhero.io",
} as const;

export type FoodpandaEnvironment = keyof typeof FOODPANDA_HOSTS;

export interface FoodpandaAuth {
  clientId: string;
  clientSecret: string;
  environment: FoodpandaEnvironment;
}

export type FoodpandaResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
// Re-request a minute early rather than racing the expiry on a slow request.
const TOKEN_SAFETY_WINDOW_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Token cache, keyed by client id + environment so two stores (or a store's
 * sandbox and live accounts) never share one. The token endpoint is rate
 * limited to 50 requests/minute/client id, so caching is not just an
 * optimisation — a sync that fetched a token per request would trip it.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** Drops a cached token, e.g. after a 401 suggests it was revoked early. */
export function invalidateFoodpandaToken(auth: FoodpandaAuth): void {
  tokenCache.delete(`${auth.environment}:${auth.clientId}`);
}

export async function getFoodpandaToken(
  auth: FoodpandaAuth,
): Promise<FoodpandaResult<string>> {
  const key = `${auth.environment}:${auth.clientId}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ok: true, data: cached.token };

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
  });

  try {
    const res = await fetch(`${FOODPANDA_HOSTS[auth.environment]}/v2/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const raw = await res.text();

    if (!res.ok) {
      if (res.status === 429) {
        return { ok: false, status: 429, error: "foodpanda rate limit reached — try again in a minute" };
      }
      return {
        ok: false,
        status: res.status,
        error: res.status === 401
          ? "foodpanda rejected the client id or secret"
          : `foodpanda token request failed (${res.status})`,
      };
    }

    const parsed = JSON.parse(raw) as { access_token?: string; expires_in?: number };
    if (!parsed.access_token) return { ok: false, error: "foodpanda returned no access token" };

    const ttlMs = (parsed.expires_in ?? 7200) * 1000;
    tokenCache.set(key, {
      token: parsed.access_token,
      expiresAt: Date.now() + Math.max(0, ttlMs - TOKEN_SAFETY_WINDOW_MS),
    });
    return { ok: true, data: parsed.access_token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach foodpanda" };
  }
}

/** Pulls the most specific message out of whatever shape the error body has. */
function extractError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.message === "string") return b.message;
    if (typeof b.error === "string") return b.error;
    if (b.error && typeof b.error === "object") {
      const e = b.error as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
    }
    if (Array.isArray(b.errors) && b.errors.length) return JSON.stringify(b.errors[0]);
  }
  return fallback;
}

async function request<T>(
  auth: FoodpandaAuth,
  method: "GET" | "POST" | "PUT",
  path: string,
  payload?: unknown,
  retryOnUnauthorized = true,
): Promise<FoodpandaResult<T>> {
  const tokenResult = await getFoodpandaToken(auth);
  if (!tokenResult.ok) return tokenResult;

  const url = `${FOODPANDA_HOSTS[auth.environment]}${path}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          Accept: "application/json",
          ...(payload !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
      });

      // Text first, so an HTML error page from a proxy is still legible
      // instead of being swallowed by a .json() parse failure.
      const raw = await res.text();
      let body: unknown = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = null;
      }

      if (res.status === 401 && retryOnUnauthorized) {
        // The cached token was rejected — drop it and try once with a fresh one.
        invalidateFoodpandaToken(auth);
        return request<T>(auth, method, path, payload, false);
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        const looksLikeHtml = raw.trimStart().startsWith("<");
        console.error(`foodpanda API ${res.status} on ${method} ${path}:`, raw.slice(0, 500) || "(empty)");
        return {
          ok: false,
          status: res.status,
          error: extractError(body, !raw || looksLikeHtml ? `foodpanda returned ${res.status}` : raw.slice(0, 300)),
        };
      }

      return { ok: true, data: body as T };
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error calling foodpanda" };
    }
  }

  return { ok: false, error: "foodpanda request failed after retrying" };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface FoodpandaCatalogProduct {
  remote_product_id?: string;
  sku: string;
  barcodes?: string[];
  title?: Record<string, string>;
  description?: Record<string, string>;
  images?: string[];
  price?: string;
  categories?: unknown[];
  active?: boolean;
  is_sold_by_weight?: boolean;
}

export interface FoodpandaCatalogPage {
  page_number: number;
  total_pages: number;
  page_size: number;
  products: FoodpandaCatalogProduct[];
}

export interface FoodpandaJobAccepted {
  job_id: string;
  job_status?: string;
  duplicated_products?: unknown[];
}

/** GET the vendor's live catalogue, one page at a time (page_size max 500). */
export function getCatalog(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
  opts: { page?: number; pageSize?: number; query?: string; locale?: string; isActive?: boolean } = {},
): Promise<FoodpandaResult<FoodpandaCatalogPage>> {
  const q = new URLSearchParams();
  q.set("page", String(opts.page ?? 1));
  q.set("page_size", String(Math.min(500, Math.max(1, opts.pageSize ?? 100))));
  if (opts.query) q.set("query_term", opts.query);
  if (opts.locale) q.set("locale", opts.locale);
  if (opts.isActive !== undefined) q.set("is_active", String(opts.isActive));
  return request(auth, "GET", `/v2/chains/${chainId}/vendors/${vendorId}/catalog?${q.toString()}`);
}

/**
 * Update price / availability for existing SKUs. Asynchronous: answers 202
 * with a job_id and the result arrives on the catalog webhook. Each product
 * needs an sku plus at least one of price, active or quantity.
 */
export function updateCatalogProducts(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
  products: { sku: string; price?: string; active?: boolean; quantity?: number }[],
): Promise<FoodpandaResult<FoodpandaJobAccepted>> {
  return request(auth, "PUT", `/v2/chains/${chainId}/vendors/${vendorId}/catalog`, { products });
}

/** Export the full catalogue; the download URL arrives on the catalog webhook. */
export function exportCatalog(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
): Promise<FoodpandaResult<FoodpandaJobAccepted>> {
  return request(auth, "POST", `/v2/chains/${chainId}/vendors/${vendorId}/catalog/export`, {});
}

/** Vendor categories, needed to map a Shei Hoise category onto a global id. */
export function getCategories(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
  onlyLeaves = true,
): Promise<FoodpandaResult<{ categories: unknown[] }>> {
  return request(
    auth,
    "GET",
    `/v2/chains/${chainId}/vendors/${vendorId}/categories?only_leaves=${onlyLeaves}`,
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type FoodpandaOrderStatus =
  | "RECEIVED"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export function getOrder(
  auth: FoodpandaAuth,
  chainId: string,
  orderId: string,
): Promise<FoodpandaResult<Record<string, unknown>>> {
  return request(auth, "GET", `/v2/chains/${chainId}/orders/${orderId}`);
}

/**
 * Move an order along. Which statuses are legal depends on transport_type:
 * VENDOR_DELIVERY accepts CANCELLED or DISPATCHED; LOGISTICS_DELIVERY accepts
 * CANCELLED or READY_FOR_PICKUP. Once dispatched or ready, it cannot be
 * cancelled, and vice versa — foodpanda enforces this, we surface its error.
 */
export function updateOrderStatus(
  auth: FoodpandaAuth,
  chainId: string,
  orderId: string,
  status: FoodpandaOrderStatus,
  options: { reason?: string; items?: unknown[] } = {},
): Promise<FoodpandaResult<Record<string, unknown>>> {
  const payload: Record<string, unknown> = { order_id: orderId, status };
  if (options.items) payload.items = options.items;
  if (status === "CANCELLED") payload.cancellation = { reason: options.reason ?? "CLOSED" };
  return request(auth, "PUT", `/v2/chains/${chainId}/orders/${orderId}`, payload);
}

/** Order history for a vendor. start/end are ISO 8601, max 60 days back. */
export function getVendorOrders(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
  startTime: string,
  endTime: string,
  page = 1,
  pageSize = 100,
): Promise<FoodpandaResult<{ orders: unknown[]; page_number: number; total_pages: number }>> {
  const q = new URLSearchParams({
    start_time: startTime,
    end_time: endTime,
    page: String(page),
    page_size: String(Math.min(500, Math.max(1, pageSize))),
  });
  return request(auth, "GET", `/v2/chains/${chainId}/vendors/${vendorId}/orders?${q.toString()}`);
}

// ---------------------------------------------------------------------------
// Outlet availability
// ---------------------------------------------------------------------------

export type FoodpandaOutletStatus = "OPEN" | "CLOSED" | "CLOSED_TODAY" | "CLOSED_UNTIL" | "CHECKIN";

export const FOODPANDA_CLOSED_REASONS = [
  "TOO_BUSY_NO_DRIVERS",
  "TOO_BUSY_KITCHEN",
  "UPDATES_IN_MENU",
  "TECHNICAL_PROBLEM",
  "CLOSED",
  "OTHER",
  "BAD_WEATHER",
  "HOLIDAY_SPECIAL_DAY",
] as const;

export function getOutletStatus(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
): Promise<FoodpandaResult<{ status?: string; closed_reason?: string; closed_until?: string }>> {
  return request(auth, "GET", `/v2/chains/${chainId}/vendors/${vendorId}/status`);
}

export function setOutletStatus(
  auth: FoodpandaAuth,
  chainId: string,
  vendorId: string,
  status: FoodpandaOutletStatus,
  options: { closedReason?: string; closedUntil?: string } = {},
): Promise<FoodpandaResult<Record<string, unknown>>> {
  const payload: Record<string, unknown> = { status };
  if (options.closedReason) payload.closed_reason = options.closedReason;
  if (status === "CLOSED_UNTIL" && options.closedUntil) payload.closed_until = options.closedUntil;
  return request(auth, "PUT", `/v2/chains/${chainId}/vendors/${vendorId}/status`, payload);
}
