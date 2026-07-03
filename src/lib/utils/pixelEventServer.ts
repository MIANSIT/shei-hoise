import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "./planFeatures";
import { getStoreFeatureSubscription } from "./getStoreFeatureSubscription";
import { sendConversionApiEvent } from "./fbConversionApi";

interface FireServerPixelEventParams {
  storeId: string;
  eventName: string;
  eventId: string;
  eventParams: Record<string, unknown>;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

/**
 * Mirrors an event into pixel_events and forwards it to Meta's Conversions API
 * if the store is entitled and has credentials saved. Never throws — CAPI
 * failures are logged and recorded on the row, not propagated to the caller.
 */
export async function fireServerPixelEvent(params: FireServerPixelEventParams): Promise<void> {
  const { data: inserted } = await supabaseAdmin
    .from("pixel_events")
    .insert({
      store_id: params.storeId,
      event_name: params.eventName,
      metadata: params.eventParams,
    })
    .select("id")
    .single();

  try {
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("facebook_pixel_id, facebook_capi_access_token, facebook_test_event_code")
      .eq("store_id", params.storeId)
      .maybeSingle();

    const subscription = await getStoreFeatureSubscription(params.storeId);
    const entitled = hasFeature(subscription, "conversion_api");

    if (entitled && settings?.facebook_pixel_id && settings?.facebook_capi_access_token && inserted) {
      const result = await sendConversionApiEvent({
        pixelId: settings.facebook_pixel_id,
        encryptedAccessToken: settings.facebook_capi_access_token,
        testEventCode: settings.facebook_test_event_code,
        eventName: params.eventName,
        eventId: params.eventId,
        fbp: params.fbp,
        fbc: params.fbc,
        clientIpAddress: params.clientIpAddress,
        clientUserAgent: params.clientUserAgent,
        customData: params.eventParams,
      });

      await supabaseAdmin
        .from("pixel_events")
        .update({ capi_delivered: result.delivered, capi_error: result.error })
        .eq("id", inserted.id);
    }
  } catch (err) {
    console.error("Conversions API forward failed:", err);
  }
}
