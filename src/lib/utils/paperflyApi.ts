// Raw Paperfly API sender — no Supabase, no throwing. Auth is HTTP Basic
// (Merchant Panel username/password) plus a static "paperflykey" header.
// No OAuth, no token refresh.

const ORDER_URL = "https://api.paperfly.com.bd/merchant/api/service/new_order_v2.php";
const TRACKING_URL = "https://api.paperfly.com.bd/API-Order-Tracking";
// The trailing slash matters — without it Paperfly's Apache returns a 404 HTML page.
const CANCEL_URL = "https://api.paperfly.com.bd/api/v1/cancel-order/";

export interface PaperflyAuth {
  username: string;
  password: string;
  paperflyKey: string;
}

export type PaperflyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pulls the most specific message out of whatever shape Paperfly's error body happens to be. */
function extractPaperflyErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const anyBody = body as Record<string, unknown>;
    if (anyBody.error && typeof anyBody.error === "object") {
      const err = anyBody.error as Record<string, unknown>;
      if (typeof err.message === "string") return err.message;
    }
    if (typeof anyBody.error === "string") return anyBody.error;
    if (typeof anyBody.message === "string") return anyBody.message;
  }
  return fallback;
}

async function paperflyPost<T>(
  auth: PaperflyAuth,
  url: string,
  payload: Record<string, unknown>,
): Promise<PaperflyResult<T>> {
  const basic = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basic}`,
          paperflykey: auth.paperflyKey,
        },
        body: JSON.stringify(payload),
      });

      // Read as text first so a non-JSON failure body (HTML from a proxy,
      // plain text) is still visible instead of being swallowed by .json().
      const rawText = await res.text();
      let body: unknown = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        body = null;
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        console.error(`Paperfly API ${res.status} on ${url}:`, rawText || "(empty body)");
        // Never surface an HTML error page (Apache 404 etc.) to staff as-is.
        const looksLikeHtml = rawText.trimStart().startsWith("<");
        return {
          ok: false,
          status: res.status,
          error: extractPaperflyErrorMessage(
            body,
            !rawText || looksLikeHtml ? `Paperfly API returned ${res.status}` : rawText,
          ),
        };
      }

      // Paperfly sometimes answers HTTP 200 with an { error: {...} } body.
      if (body && typeof body === "object" && "error" in body) {
        console.error(`Paperfly API error body on ${url}:`, rawText);
        return { ok: false, status: res.status, error: extractPaperflyErrorMessage(body, "Paperfly rejected the request") };
      }

      return { ok: true, data: body as T };
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      const message = err instanceof Error ? err.message : "Unknown error calling Paperfly API";
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: "Paperfly API request failed after retrying" };
}

export interface CreatePaperflyOrderPayload {
  merchantOrderReference: string;
  storeName: string;
  productBrief: string;
  packagePrice: string;
  max_weight: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
}

export interface CreatePaperflyOrderResponse {
  success?: {
    message: string;
    tracking_number: string;
    tracking_barcode?: string;
  };
  response_code?: number;
}

export function createOrder(
  auth: PaperflyAuth,
  payload: CreatePaperflyOrderPayload,
): Promise<PaperflyResult<CreatePaperflyOrderResponse>> {
  return paperflyPost(auth, ORDER_URL, { ...payload });
}

/**
 * One row of Paperfly's tracking response. Each milestone is an empty
 * string / null until reached, then holds a value (with a matching *Time).
 */
export type PaperflyTrackingRow = Record<string, string | null>;

export interface PaperflyTrackingResponse {
  success?: {
    message: string;
    trackingStatus?: PaperflyTrackingRow[];
  };
}

/**
 * Tracking is looked up by the merchantOrderReference sent at creation —
 * confirmed live: the tracking_number returns "No Order Found". Real row
 * fields: invNum, receivedAmount, Pick, inTransit, ReceivedAtPoint,
 * PickedForDelivery, Delivered, Returned, Partial, onHoldSchedule, close
 * (each with a matching *Time).
 */
export function trackOrder(
  auth: PaperflyAuth,
  referenceNumber: string,
): Promise<PaperflyResult<PaperflyTrackingResponse>> {
  return paperflyPost(auth, TRACKING_URL, { ReferenceNumber: referenceNumber });
}

export interface PaperflyCancelResponse {
  success?: {
    message: string;
    response_code?: number;
  };
}

/**
 * Body per Paperfly's docs: { order_id: merchantOrderReference }. Needs the
 * paperflykey header too, despite the docs listing only Basic Auth.
 *
 * UNCONFIRMED: against a live, pending parcel (trackable with the same
 * credentials) this returned { error: { message: "invalid" } } for every
 * body shape tried — order_id / ReferenceNumber, reference / tracking
 * number, JSON / form / query string. Awaiting Paperfly support.
 */
export async function cancelOrder(
  auth: PaperflyAuth,
  referenceNumber: string,
): Promise<PaperflyResult<PaperflyCancelResponse>> {
  const result = await paperflyPost<PaperflyCancelResponse>(auth, CANCEL_URL, {
    order_id: referenceNumber,
  });
  if (result.ok && !result.data?.success) {
    return { ok: false, error: "Paperfly did not confirm the cancellation" };
  }
  return result;
}

// Latest milestone first — the first one that's been reached wins.
const MILESTONES: { key: string; status: string }[] = [
  { key: "Returned", status: "Returned" },
  { key: "Partial", status: "Partial_Delivery" },
  { key: "Delivered", status: "Delivered" },
  { key: "onHoldSchedule", status: "On_Hold" },
  { key: "PickedForDelivery", status: "Out_For_Delivery" },
  { key: "ReceivedAtPoint", status: "Received_At_Point" },
  { key: "inTransit", status: "In_Transit" },
  { key: "Pick", status: "Picked" },
];

function isReached(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim() !== "";
}

/**
 * Collapses Paperfly's milestone-per-field tracking row into one status
 * string the rest of the app understands (courierStatus/courierStatusDisplay
 * classify by keyword). Any cancel/close-looking field that's been reached
 * wins over everything else.
 */
export function derivePaperflyStatus(row: PaperflyTrackingRow | undefined): string {
  if (!row) return "Pending";
  for (const [key, value] of Object.entries(row)) {
    const k = key.toLowerCase();
    if ((k.includes("cancel") || k.includes("close")) && !k.endsWith("time") && isReached(value)) {
      return "Cancelled";
    }
  }
  for (const m of MILESTONES) {
    if (isReached(row[m.key])) return m.status;
  }
  return "Pending";
}
