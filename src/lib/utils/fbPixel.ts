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

function newEventId(event: string, params?: FbqParams): string {
  const orderId = params?.order_id;
  if (typeof orderId === "string" && orderId.length > 0) return orderId;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${event}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * A stable anonymous id for this browser, sent to Meta (hashed) as external_id
 * so it can link one visitor's events together across sessions.
 */
function getVisitorId(): string | undefined {
  try {
    const existing = localStorage.getItem("sh_vid");
    if (existing) return existing;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("sh_vid", id);
    return id;
  } catch {
    return undefined;
  }
}

/**
 * Meta's click id. Normally the pixel writes the _fbc cookie itself, but when
 * it hasn't yet (or is blocked) it can be rebuilt from the fbclid on the URL —
 * format `fb.1.<click time ms>.<fbclid>`.
 */
function getFbc(): string | undefined {
  const cookie = readCookie("_fbc");
  if (cookie) return cookie;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("fbclid");
    const stored = localStorage.getItem("sh_utm");
    const fromStorage = stored ? (JSON.parse(stored) as { fbclid?: string }).fbclid : undefined;
    const fbclid = fromUrl || fromStorage;
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  } catch {
    return undefined;
  }
}

/** What we know about the customer at the moment of the event. All optional. */
export interface FbqIdentity {
  phone?: string;
  email?: string;
  name?: string;
  city?: string;
  postCode?: string;
  country?: string;
}

function readStoredUtm(): FbqParams | null {
  try {
    const raw = localStorage.getItem("sh_utm");
    return raw ? (JSON.parse(raw) as FbqParams) : null;
  } catch {
    return null;
  }
}

/** Mirrors one event to our DB and forwards it to the Conversions API (fire-and-forget). */
function postServerEvent(
  event: string,
  params: FbqParams | undefined,
  storeSlug: string,
  eventId: string,
  identity?: FbqIdentity,
): void {
  const utm = readStoredUtm();
  const mergedParams = utm ? { ...(params || {}), ...utm } : params;

  fetch("/api/pixel-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      params: mergedParams,
      store_slug: storeSlug,
      eventId,
      fbp: readCookie("_fbp"),
      fbc: getFbc(),
      eventSourceUrl: window.location.href,
      customer: { ...identity, externalId: getVisitorId() },
    }),
  }).catch(() => {});
}

export const FbEvent = {
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",
  ADD_TO_CART: "AddToCart",
  INITIATE_CHECKOUT: "InitiateCheckout",
  ADD_PAYMENT_INFO: "AddPaymentInfo",
  PURCHASE: "Purchase",
  SEARCH: "Search",
  LEAD: "Lead",
  CONTACT: "Contact",
  /** Not a Meta standard event — sent with trackCustom. */
  VIEW_CATEGORY: "ViewCategory",
} as const;

const CUSTOM_EVENTS: ReadonlySet<string> = new Set([FbEvent.VIEW_CATEGORY]);

export function fbq(event: string, params?: FbqParams, storeSlug?: string, identity?: FbqIdentity): void {
  if (typeof window === "undefined") return;
  const eventId = newEventId(event, params);

  // Send to Facebook (browser pixel) — eventID lets Meta dedup this against
  // the server-side CAPI copy of the same event, sent with the same eventId.
  if (window.fbq) {
    const method = CUSTOM_EVENTS.has(event) ? "trackCustom" : "track";
    window.fbq(method, event, params ?? {}, { eventID: eventId });
  }

  if (storeSlug) postServerEvent(event, params, storeSlug, eventId, identity);
}

const PAGE_VIEW_MAX_ATTEMPTS = 10;
const PAGE_VIEW_RETRY_MS = 200;

/**
 * Fires PageView to the browser pixel and the Conversions API with ONE shared
 * event id, so Meta counts it once. The pixel loads after the page, so this
 * waits briefly for it (and for the _fbp cookie it sets) before the server
 * copy goes out; if the pixel never shows up (ad blocker), the server copy is
 * still sent.
 */
export function trackPageView(storeSlug: string, params: FbqParams = {}): void {
  if (typeof window === "undefined") return;
  const eventId = newEventId(FbEvent.PAGE_VIEW);
  let attempts = 0;
  let browserSent = false;

  const tick = () => {
    attempts++;
    if (!browserSent && window.fbq) {
      window.fbq("track", FbEvent.PAGE_VIEW, {}, { eventID: eventId });
      browserSent = true;
    }
    const ready = browserSent && Boolean(readCookie("_fbp"));
    if (ready || attempts >= PAGE_VIEW_MAX_ATTEMPTS) {
      postServerEvent(FbEvent.PAGE_VIEW, params, storeSlug, eventId);
      return;
    }
    setTimeout(tick, PAGE_VIEW_RETRY_MS);
  };

  tick();
}
