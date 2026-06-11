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

export function fbq(event: string, params?: FbqParams, storeSlug?: string): void {
  // Send to Facebook
  if (typeof window !== "undefined" && window.fbq) {
    if (params) {
      window.fbq("track", event, params);
    } else {
      window.fbq("track", event);
    }
  }

  // Mirror to our own DB for the analytics dashboard (fire-and-forget)
  if (storeSlug) {
    // merge persisted UTM params (if any) so campaign data is stored
    try {
      const utmRaw = typeof window !== "undefined" ? localStorage.getItem("sh_utm") : null;
      const utm = utmRaw ? JSON.parse(utmRaw) : null;
      const mergedParams = utm ? { ...(params || {}), ...utm } : params;

      fetch("/api/pixel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, params: mergedParams, store_slug: storeSlug }),
      }).catch(() => {});
    } catch {
      fetch("/api/pixel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, params, store_slug: storeSlug }),
      }).catch(() => {});
    }
  }
}

export const FbEvent = {
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",
  ADD_TO_CART: "AddToCart",
  INITIATE_CHECKOUT: "InitiateCheckout",
  PURCHASE: "Purchase",
} as const;
