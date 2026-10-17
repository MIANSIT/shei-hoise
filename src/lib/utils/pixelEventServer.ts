import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "./planFeatures";
import { getStoreFeatureSubscription } from "./getStoreFeatureSubscription";
import { sendConversionApiEvent, listMatchKeys, type CapiCustomer } from "./fbConversionApi";

interface FireServerPixelEventParams {
  storeId: string;
  eventName: string;
  eventId: string;
  eventParams: Record<string, unknown>;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
  customer?: CapiCustomer;
}

/**
 * Mirrors an event into pixel_events and forwards it to Meta's Conversions API
 * if the store is entitled and has credentials saved. Never throws — CAPI
 * failures are logged and recorded on the row, not propagated to the caller.
 *
 * The row's metadata also carries `_match`: the names (never the values) of the
 * identifiers sent with the event, which the analytics dashboard uses to show
 * the store's customer-data coverage — and `_visitor`, a hashed anonymous
 * visitor id used to count unique visitors.
 */
export async function fireServerPixelEvent(params: FireServerPixelEventParams): Promise<void> {
  const matchKeys = listMatchKeys({
    fbp: params.fbp,
    fbc: params.fbc,
    clientIpAddress: params.clientIpAddress,
    clientUserAgent: params.clientUserAgent,
    customer: params.customer,
  });

  // A short one-way hash of the anonymous visitor id, so the dashboard can
  // count distinct visitors without storing the id itself.
  const visitor = params.customer?.externalId
    ? createHash("sha256").update(params.customer.externalId).digest("hex").slice(0, 16)
    : undefined;

  const { data: inserted } = await supabaseAdmin
    .from("pixel_events")
    .insert({
      store_id: params.storeId,
      event_name: params.eventName,
      metadata: { ...params.eventParams, _match: matchKeys, ...(visitor ? { _visitor: visitor } : {}) },
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
        eventSourceUrl: params.eventSourceUrl,
        customData: params.eventParams,
        customer: params.customer,
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
