import { decrypt } from "./encryption";

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
  customData?: Record<string, unknown>;
}

export interface SendCapiEventResult {
  delivered: boolean;
  error: string | null;
}

/** Sends one event to Meta's Conversions API. Never throws — failures are returned, not raised. */
export async function sendConversionApiEvent(
  params: SendCapiEventParams,
): Promise<SendCapiEventResult> {
  try {
    const accessToken = decrypt(params.encryptedAccessToken);

    const userData: Record<string, unknown> = {};
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;
    if (params.clientIpAddress) userData.client_ip_address = params.clientIpAddress;
    if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: params.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: params.eventId,
          action_source: "website",
          user_data: userData,
          custom_data: params.customData ?? {},
        },
      ],
      access_token: accessToken,
    };

    if (params.testEventCode) {
      payload.test_event_code = params.testEventCode;
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${params.pixelId}/events`, {
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
