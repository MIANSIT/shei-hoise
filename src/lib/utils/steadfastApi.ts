// Raw Steadfast Courier API sender — no Supabase, no throwing. Auth is a
// static Api-Key/Secret-Key pair (no OAuth, no token refresh, never expires).

const BASE_URL = "https://portal.packzy.com/api/v1";

export type SteadfastResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pulls the most specific message out of whatever shape Steadfast's error body happens to be. */
function extractSteadfastErrorMessage(body: unknown, fallback: string): string {
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

async function steadfastFetch<T>(
  apiKey: string,
  secretKey: string,
  path: string,
  init: RequestInit,
): Promise<SteadfastResult<T>> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          ...init.headers,
        },
      });

      // Read as text first — if Steadfast returns a non-JSON body (plain
      // text, an HTML error page from a proxy/WAF, etc.) on failure, .json()
      // would silently swallow it and we'd never see what was actually
      // rejected, which is exactly what was happening before this change.
      const rawText = await res.text();
      let body: unknown = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        body = null;
      }

      if (!res.ok) {
        // Only 5xx is worth retrying — a 4xx means the request itself was
        // wrong (bad input, invalid keys) and trying again won't help.
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        console.error(`Steadfast API ${res.status} on ${path}:`, rawText || "(empty body)");
        const message = extractSteadfastErrorMessage(
          body,
          rawText || `Steadfast API returned ${res.status}`,
        );
        return { ok: false, error: message };
      }

      return { ok: true, data: body as T };
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      const message = err instanceof Error ? err.message : "Unknown error calling Steadfast API";
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: "Steadfast API request failed after retrying" };
}

export interface SteadfastBalanceResponse {
  status: number;
  current_balance: number;
}

export function getBalance(
  apiKey: string,
  secretKey: string,
): Promise<SteadfastResult<SteadfastBalanceResponse>> {
  return steadfastFetch(apiKey, secretKey, "/get_balance", { method: "GET" });
}

export interface CreateSteadfastOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
}

export interface CreateSteadfastOrderResponseData {
  consignment_id: number;
  invoice: string;
  tracking_code: string;
  status: string;
}

export function createOrder(
  apiKey: string,
  secretKey: string,
  payload: CreateSteadfastOrderPayload,
): Promise<SteadfastResult<{ status: number; message: string; consignment: CreateSteadfastOrderResponseData }>> {
  return steadfastFetch(apiKey, secretKey, "/create_order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface SteadfastStatusResponse {
  status: number;
  delivery_status: string;
}

export function getStatusByTrackingCode(
  apiKey: string,
  secretKey: string,
  trackingCode: string,
): Promise<SteadfastResult<SteadfastStatusResponse>> {
  return steadfastFetch(apiKey, secretKey, `/status_by_trackingcode/${trackingCode}`, {
    method: "GET",
  });
}
