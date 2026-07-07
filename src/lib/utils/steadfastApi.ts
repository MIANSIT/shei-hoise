// Raw Steadfast Courier API sender — no Supabase, no throwing. Auth is a
// static Api-Key/Secret-Key pair (no OAuth, no token refresh, never expires).

const BASE_URL = "https://portal.packzy.com/api/v1";

export type SteadfastResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function steadfastFetch<T>(
  apiKey: string,
  secretKey: string,
  path: string,
  init: RequestInit,
): Promise<SteadfastResult<T>> {
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

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        (body?.message as string | undefined) ?? `Steadfast API returned ${res.status}`;
      return { ok: false, error: message };
    }

    return { ok: true, data: body as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Steadfast API";
    return { ok: false, error: message };
  }
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
