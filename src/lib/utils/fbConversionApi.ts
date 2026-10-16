import { createHash } from "crypto";
import { decrypt } from "./encryption";

/** Graph API version shared by the Conversions API and the Marketing API calls. */
export const GRAPH_API_VERSION = "v23.0";

/**
 * Who the event is about. Every field is optional — Meta matches on whatever
 * it gets, and each extra field raises the Event Match Quality score. All of
 * it is hashed (SHA-256) before it leaves this module.
 */
export interface CapiCustomer {
  phone?: string | null;
  email?: string | null;
  /** Full name as typed at checkout; split into first / last name before hashing. */
  name?: string | null;
  city?: string | null;
  postCode?: string | null;
  /** Country name or ISO code ("Bangladesh" / "BD"). */
  country?: string | null;
  /** A stable id for this person or browser (hashed) so Meta can link their events. */
  externalId?: string | null;
}

interface SendCapiEventParams {
  pixelId: string;
  encryptedAccessToken: string;
  testEventCode?: string | null;
  eventName: string;
  eventId: string;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  /** The page the event happened on — Meta uses it for attribution and dedup. */
  eventSourceUrl?: string | null;
  customData?: Record<string, unknown>;
  customer?: CapiCustomer;
}

export interface SendCapiEventResult {
  delivered: boolean;
  error: string | null;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Bangladeshi numbers are stored locally as 11 digits starting with 0;
// Meta requires E.164 (country code, no leading zero or plus) before hashing.
function normalizeBdPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits;
}

// Meta wants letters/digits only, lower-cased, no spaces or punctuation.
function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizeCountry(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(value)) return value;
  if (value.includes("bangladesh") || value.includes("বাংলাদেশ")) return "bd";
  return null;
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * x-forwarded-for is a comma-separated chain ("client, proxy1, proxy2");
 * Meta needs the single client address, which is the first entry.
 */
export function pickClientIp(forwardedFor: string | null | undefined): string | null {
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}

/** Builds Meta's hashed `user_data` customer fields from raw checkout details. */
function buildHashedCustomerFields(customer: CapiCustomer | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!customer) return out;

  if (customer.phone) {
    const ph = normalizeBdPhone(customer.phone);
    if (ph) out.ph = [sha256Hex(ph)];
  }
  if (customer.email) {
    const em = customer.email.trim().toLowerCase();
    if (em) out.em = [sha256Hex(em)];
  }
  if (customer.name) {
    const { first, last } = splitName(customer.name);
    const fn = normalizeWord(first);
    const ln = normalizeWord(last);
    if (fn) out.fn = [sha256Hex(fn)];
    if (ln) out.ln = [sha256Hex(ln)];
  }
  if (customer.city) {
    const ct = normalizeWord(customer.city);
    if (ct) out.ct = [sha256Hex(ct)];
  }
  if (customer.postCode) {
    const zp = normalizeWord(customer.postCode);
    if (zp) out.zp = [sha256Hex(zp)];
  }
  if (customer.country) {
    const country = normalizeCountry(customer.country);
    if (country) out.country = [sha256Hex(country)];
  }
  if (customer.externalId) {
    const id = customer.externalId.trim();
    if (id) out.external_id = [sha256Hex(id)];
  }
  return out;
}

/**
 * Names of the identifiers an event carries (fbp, fbc, ph, em, fn, ln, ct, zp,
 * country, external_id, ip, ua). Stored with the event so the dashboard can
 * show how well-identified the store's traffic is, without ever storing the
 * identifiers themselves.
 */
export function listMatchKeys(args: {
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  customer?: CapiCustomer;
}): string[] {
  const keys: string[] = [];
  if (args.fbp) keys.push("fbp");
  if (args.fbc) keys.push("fbc");
  if (args.clientIpAddress) keys.push("ip");
  if (args.clientUserAgent) keys.push("ua");
  keys.push(...Object.keys(buildHashedCustomerFields(args.customer)));
  return keys;
}

/** Sends one event to Meta's Conversions API. Never throws — failures are returned, not raised. */
export async function sendConversionApiEvent(
  params: SendCapiEventParams,
): Promise<SendCapiEventResult> {
  try {
    const accessToken = decrypt(params.encryptedAccessToken);

    const userData: Record<string, unknown> = { ...buildHashedCustomerFields(params.customer) };
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;
    const ip = pickClientIp(params.clientIpAddress);
    if (ip) userData.client_ip_address = ip;
    if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;

    const event: Record<string, unknown> = {
      event_name: params.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.eventId,
      action_source: "website",
      user_data: userData,
      custom_data: params.customData ?? {},
    };
    if (params.eventSourceUrl) event.event_source_url = params.eventSourceUrl;

    const payload: Record<string, unknown> = {
      data: [event],
      access_token: accessToken,
    };

    if (params.testEventCode) {
      payload.test_event_code = params.testEventCode;
    }

    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${params.pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        (body?.error?.message as string | undefined) ?? `Facebook API returned ${res.status}`;
      return { delivered: false, error: message };
    }

    return { delivered: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error sending Conversions API event";
    return { delivered: false, error: message };
  }
}
