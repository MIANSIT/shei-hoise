// Raw Pathao Courier Merchant API sender — no Supabase, no throwing.
// Every function takes a PathaoEnvironment first so a single store's calls
// always route to the right host, sandbox or live.

export type PathaoEnvironment = "sandbox" | "live";

const SANDBOX_BASE_URL = "https://courier-api-sandbox.pathao.com";
const LIVE_BASE_URL = "https://api-hermes.pathao.com";

/**
 * Sandbox testing is done — every new connection now goes straight to
 * Pathao's live environment, regardless of dev/production. Not a store
 * owner's choice either way.
 */
export function getResolvedPathaoEnvironment(): PathaoEnvironment {
  return "live";
}

function resolveBaseUrl(environment: PathaoEnvironment): string {
  return environment === "sandbox" ? SANDBOX_BASE_URL : LIVE_BASE_URL;
}

export type PathaoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pulls the most specific message out of whatever shape Pathao's error body happens to be. */
function extractPathaoErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const anyBody = body as Record<string, unknown>;
    if (typeof anyBody.message === "string") return anyBody.message;
    if (anyBody.errors && typeof anyBody.errors === "object") {
      const firstError = Object.values(anyBody.errors as Record<string, unknown>)[0];
      if (Array.isArray(firstError) && typeof firstError[0] === "string") return firstError[0];
      if (typeof firstError === "string") return firstError;
    }
  }
  return fallback;
}

async function pathaoFetch<T>(
  environment: PathaoEnvironment,
  path: string,
  init: RequestInit,
): Promise<PathaoResult<T>> {
  const baseUrl = resolveBaseUrl(environment);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        // Only 5xx is worth retrying — a 4xx means the request itself was
        // wrong (bad input, expired token) and trying again won't help.
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        console.error(`Pathao API ${res.status} on ${path}:`, body);
        const message = extractPathaoErrorMessage(body, `Pathao API returned ${res.status}`);
        return { ok: false, error: message };
      }

      return { ok: true, data: body as T };
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      const message = err instanceof Error ? err.message : "Unknown error calling Pathao API";
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: "Pathao API request failed after retrying" };
}

function authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface PathaoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export function issueToken(
  environment: PathaoEnvironment,
  params: { client_id: string; client_secret: string; username: string; password: string },
): Promise<PathaoResult<PathaoTokenResponse>> {
  return pathaoFetch<PathaoTokenResponse>(environment, "/aladdin/api/v1/issue-token", {
    method: "POST",
    body: JSON.stringify({ ...params, grant_type: "password" }),
  });
}

export function refreshAccessToken(
  environment: PathaoEnvironment,
  params: { client_id: string; client_secret: string; refresh_token: string },
): Promise<PathaoResult<PathaoTokenResponse>> {
  return pathaoFetch<PathaoTokenResponse>(environment, "/aladdin/api/v1/issue-token", {
    method: "POST",
    body: JSON.stringify({ ...params, grant_type: "refresh_token" }),
  });
}

// ─── Stores ─────────────────────────────────────────────────────────────────

export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: number;
  city_id: number;
  zone_id: number;
  hub_id: number;
  is_default_store: boolean;
  is_default_return_store: boolean;
}

export function getMerchantStores(
  environment: PathaoEnvironment,
  accessToken: string,
): Promise<PathaoResult<{ data: { data: PathaoStore[] } }>> {
  return pathaoFetch(environment, "/aladdin/api/v1/stores", {
    method: "GET",
    headers: authHeader(accessToken),
  });
}

export interface CreateStorePayload {
  name: string;
  contact_name: string;
  contact_number: string;
  secondary_contact?: string;
  otp_number?: string;
  address: string;
  city_id: number;
  zone_id: number;
  area_id: number;
}

export function createStore(
  environment: PathaoEnvironment,
  accessToken: string,
  payload: CreateStorePayload,
): Promise<PathaoResult<{ message: string; data: { store_name: string } }>> {
  return pathaoFetch(environment, "/aladdin/api/v1/stores", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify(payload),
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  store_id: number;
  merchant_order_id?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_secondary_phone?: string;
  recipient_address: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  delivery_type: 48 | 12;
  item_type: 1 | 2;
  special_instruction?: string;
  item_quantity: number;
  item_weight: string;
  item_description?: string;
  amount_to_collect: number;
}

export interface CreateOrderResponseData {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  delivery_fee: number;
}

export function createOrder(
  environment: PathaoEnvironment,
  accessToken: string,
  payload: CreateOrderPayload,
): Promise<PathaoResult<{ message: string; data: CreateOrderResponseData }>> {
  return pathaoFetch(environment, "/aladdin/api/v1/orders", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify(payload),
  });
}

export interface OrderShortInfo {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  order_status_slug: string;
  updated_at: string;
  invoice_id: string | null;
}

export function getOrderInfo(
  environment: PathaoEnvironment,
  accessToken: string,
  consignmentId: string,
): Promise<PathaoResult<{ message: string; data: OrderShortInfo }>> {
  return pathaoFetch(environment, `/aladdin/api/v1/orders/${consignmentId}/info`, {
    method: "GET",
    headers: authHeader(accessToken),
  });
}

// ─── Location lookups ───────────────────────────────────────────────────────

export interface PathaoCity {
  city_id: number;
  city_name: string;
}
export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}
export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}

export function getCityList(
  environment: PathaoEnvironment,
  accessToken: string,
): Promise<PathaoResult<{ data: { data: PathaoCity[] } }>> {
  return pathaoFetch(environment, "/aladdin/api/v1/city-list", {
    method: "GET",
    headers: authHeader(accessToken),
  });
}

export function getZoneList(
  environment: PathaoEnvironment,
  accessToken: string,
  cityId: number,
): Promise<PathaoResult<{ data: { data: PathaoZone[] } }>> {
  return pathaoFetch(environment, `/aladdin/api/v1/cities/${cityId}/zone-list`, {
    method: "GET",
    headers: authHeader(accessToken),
  });
}

export function getAreaList(
  environment: PathaoEnvironment,
  accessToken: string,
  zoneId: number,
): Promise<PathaoResult<{ data: { data: PathaoArea[] } }>> {
  return pathaoFetch(environment, `/aladdin/api/v1/zones/${zoneId}/area-list`, {
    method: "GET",
    headers: authHeader(accessToken),
  });
}
