import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fireServerPixelEvent } from "@/lib/utils/pixelEventServer";

export async function POST(req: NextRequest) {
  try {
    const { event, params, store_slug, eventId, fbp, fbc, phone, email } = await req.json();

    if (!event || !store_slug) {
      return Response.json({ error: "Missing event or store_slug" }, { status: 400 });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("store_slug", store_slug)
      .single();

    if (storeError || !store) {
      return Response.json({ error: "Store not found" }, { status: 404 });
    }

    await fireServerPixelEvent({
      storeId: store.id,
      eventName: event,
      eventId: eventId ?? crypto.randomUUID(),
      eventParams: params ?? {},
      fbp,
      fbc,
      clientIpAddress: req.headers.get("x-forwarded-for"),
      clientUserAgent: req.headers.get("user-agent"),
      phone,
      email,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
