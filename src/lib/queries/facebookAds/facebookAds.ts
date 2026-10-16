"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/permissions/server";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import { hasFeature } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { fetchAdAccountInfo, fetchAdInsights, normalizeAdAccountId } from "@/lib/utils/fbMarketingApi";
import type {
  AdsPeriod,
  FacebookAdsInsights,
  FacebookAdsResult,
  FacebookAdsStatus,
} from "@/lib/types/facebookAds";

// Ad-account connection for the Pixel Analytics page. Kept apart from the
// store-settings queries on purpose: until migration 20261024000000 is applied
// these selects fail, and that must never take store settings down with it.

const NOT_CONNECTED: FacebookAdsStatus = { connected: false, accountId: null };

/** Whether an ad account is connected. Never returns the token — only that one exists. */
export async function getFacebookAdsStatus(storeId: string): Promise<FacebookAdsStatus> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("facebook_ad_account_id, facebook_ads_access_token")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) return NOT_CONNECTED;
  return {
    connected: Boolean(data.facebook_ad_account_id && data.facebook_ads_access_token),
    accountId: data.facebook_ad_account_id ?? null,
  };
}

/** Checks the pasted ad account id + token against Meta, then saves them (token encrypted). */
export async function connectFacebookAds(
  storeId: string,
  rawAccountId: string,
  rawToken: string,
): Promise<FacebookAdsResult<{ accountName: string; currency: string }>> {
  const auth = await requireOwner({ storeId });
  if (!auth.ok) return { ok: false, error: auth.error };

  const subscription = await getStoreFeatureSubscription(storeId);
  if (!hasFeature(subscription, "meta_pixel")) {
    return { ok: false, error: "Facebook ads reporting is not included in your plan." };
  }

  const accountId = normalizeAdAccountId(rawAccountId);
  const token = rawToken.trim();
  if (!accountId) return { ok: false, error: "That doesn't look like an ad account ID. It is a number of 5 or more digits." };
  if (token.length < 20) return { ok: false, error: "That doesn't look like an access token." };

  const info = await fetchAdAccountInfo(accountId, token);
  if (!info.ok) return info;

  const { error } = await supabaseAdmin
    .from("store_settings")
    .update({
      facebook_ad_account_id: accountId,
      facebook_ads_access_token: encrypt(token),
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId);

  if (error) {
    console.error("connectFacebookAds:", error);
    return { ok: false, error: "Could not save the connection. Please try again." };
  }

  return { ok: true, data: { accountName: info.data.name, currency: info.data.currency } };
}

export async function disconnectFacebookAds(storeId: string): Promise<FacebookAdsResult<null>> {
  const auth = await requireOwner({ storeId });
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await supabaseAdmin
    .from("store_settings")
    .update({
      facebook_ad_account_id: null,
      facebook_ads_access_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId);

  if (error) {
    console.error("disconnectFacebookAds:", error);
    return { ok: false, error: "Could not disconnect. Please try again." };
  }
  return { ok: true, data: null };
}

/** Ad spend, reach, clicks, purchases and ROAS for the connected ad account over the period. */
export async function getFacebookAdsInsights(
  storeId: string,
  period: AdsPeriod,
): Promise<FacebookAdsResult<FacebookAdsInsights>> {
  const auth = await requireOwner({ storeId });
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data: row, error } = await supabaseAdmin
    .from("store_settings")
    .select("facebook_ad_account_id, facebook_ads_access_token")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !row?.facebook_ad_account_id || !row.facebook_ads_access_token) {
    return { ok: false, error: "No ad account is connected." };
  }

  let token: string;
  try {
    token = decrypt(row.facebook_ads_access_token);
  } catch {
    return { ok: false, error: "The saved token could not be read. Please connect again.", reconnect: true };
  }

  const [info, insights] = await Promise.all([
    fetchAdAccountInfo(row.facebook_ad_account_id, token),
    fetchAdInsights(row.facebook_ad_account_id, token, period),
  ]);

  if (!info.ok) return info;
  if (!insights.ok) return insights;

  return {
    ok: true,
    data: { accountName: info.data.name, currency: info.data.currency, ...insights.data },
  };
}
