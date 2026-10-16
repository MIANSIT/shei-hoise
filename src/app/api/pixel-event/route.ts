import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fireServerPixelEvent } from "@/lib/utils/pixelEventServer";
import { pickClientIp, type CapiCustomer } from "@/lib/utils/fbConversionApi";

interface PixelEventBody {
  event?: unknown;
  params?: unknown;
  store_slug?: unknown;
  eventId?: unknown;
  fbp?: unknown;
  fbc?: unknown;
  eventSourceUrl?: unknown;
  customer?: unknown;
}

/** A trimmed string no longer than `max`, or null for anything else. */
function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function cleanCustomer(raw: unknown): CapiCustomer | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  return {
    phone: cleanString(c.phone, 32),
    email: cleanString(c.email, 254),
    name: cleanString(c.name, 120),
    city: cleanString(c.city, 80),
    postCode: cleanString(c.postCode, 16),
    country: cleanString(c.country, 60),
    externalId: cleanString(c.externalId, 80),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PixelEventBody;

    const event = cleanString(body.event, 64);
    const storeSlug = cleanString(body.store_slug, 128);
    if (!event || !storeSlug) {
      return Response.json({ error: "Missing event or store_slug" }, { status: 400 });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("store_slug", storeSlug)
      .single();

    if (storeError || !store) {
      return Response.json({ error: "Store not found" }, { status: 404 });
    }

    const eventParams =
      body.params && typeof body.params === "object" && !Array.isArray(body.params)
        ? (body.params as Record<string, unknown>)
        : {};

    await fireServerPixelEvent({
      storeId: store.id,
      eventName: event,
      eventId: cleanString(body.eventId, 128) ?? crypto.randomUUID(),
      eventParams,
      fbp: cleanString(body.fbp, 200),
      fbc: cleanString(body.fbc, 400),
      clientIpAddress: pickClientIp(req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")),
      clientUserAgent: req.headers.get("user-agent"),
      eventSourceUrl: cleanString(body.eventSourceUrl, 2000),
      customer: cleanCustomer(body.customer),
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
