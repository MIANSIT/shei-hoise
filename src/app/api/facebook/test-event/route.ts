import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { sendConversionApiEvent } from "@/lib/utils/fbConversionApi";

export async function POST(req: NextRequest) {
  try {
    const { store_id } = await req.json();
    if (!store_id) {
      return Response.json({ error: "Missing store_id" }, { status: 400 });
    }

    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("facebook_pixel_id, facebook_capi_access_token, facebook_test_event_code")
      .eq("store_id", store_id)
      .maybeSingle();

    if (!settings?.facebook_pixel_id || !settings?.facebook_capi_access_token) {
      return Response.json({ error: "Pixel ID and CAPI access token must be saved first" }, { status: 400 });
    }

    const subscription = await getStoreFeatureSubscription(store_id);

    if (!hasFeature(subscription, "conversion_api")) {
      return Response.json({ error: "Conversions API is not available on your plan" }, { status: 403 });
    }

    const result = await sendConversionApiEvent({
      pixelId: settings.facebook_pixel_id,
      encryptedAccessToken: settings.facebook_capi_access_token,
      testEventCode: settings.facebook_test_event_code,
      eventName: "TestEvent",
      eventId: `test-${Date.now()}`,
      clientIpAddress: req.headers.get("x-forwarded-for"),
      clientUserAgent: req.headers.get("user-agent"),
      customData: { test: true },
    });

    if (!result.delivered) {
      return Response.json({ error: result.error ?? "Failed to send test event" }, { status: 400 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
