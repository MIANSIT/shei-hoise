declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: unknown;
  }
}

type FbqParams = Record<string, unknown>;

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function generateEventId(event: string, params?: FbqParams): string {
  const orderId = params?.order_id;
  if (typeof orderId === "string" && orderId.length > 0) return orderId;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${event}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function fbq(event: string, params?: FbqParams, storeSlug?: string): void {
  const eventId = generateEventId(event, params);

  // Send to Facebook (browser pixel) — eventID lets Meta dedup this against
  // the server-side CAPI copy of the same event, sent with the same eventId.
  if (typeof window !== "undefined" && window.fbq) {
    if (params) {
      window.fbq("track", event, params, { eventID: eventId });
    } else {
      window.fbq("track", event, {}, { eventID: eventId });
    }
  }

  // Mirror to our own DB + forward to Conversions API server-side (fire-and-forget)
  if (storeSlug) {
    const fbp = readCookie("_fbp");
    const fbc = readCookie("_fbc");

    // merge persisted UTM params (if any) so campaign data is stored
    try {
      const utmRaw = typeof window !== "undefined" ? localStorage.getItem("sh_utm") : null;
      const utm = utmRaw ? JSON.parse(utmRaw) : null;
      const mergedParams = utm ? { ...(params || {}), ...utm } : params;

      fetch("/api/pixel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, params: mergedParams, store_slug: storeSlug, eventId, fbp, fbc }),
      }).catch(() => {});
    } catch {
      fetch("/api/pixel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, params, store_slug: storeSlug, eventId, fbp, fbc }),
      }).catch(() => {});
    }
  }
}

export const FbEvent = {
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",
  ADD_TO_CART: "AddToCart",
  INITIATE_CHECKOUT: "InitiateCheckout",
  ADD_PAYMENT_INFO: "AddPaymentInfo",
  PURCHASE: "Purchase",
  SEARCH: "Search",
} as const;
