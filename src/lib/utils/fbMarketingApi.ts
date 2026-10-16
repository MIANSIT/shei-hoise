import { GRAPH_API_VERSION } from "./fbConversionApi";
import type {
  AdsPeriod,
  FacebookAdsCampaign,
  FacebookAdsDay,
  FacebookAdsInsights,
  FacebookAdsResult,
  FacebookAdsTotals,
} from "@/lib/types/facebookAds";

// Server-only: talks to Meta's Marketing API with a store owner's own token.
// The token goes in an Authorization header, never the URL, so it can't leak
// into request logs.

const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Graph error code 190 = invalid / expired / revoked access token.
const TOKEN_ERROR_CODE = 190;

interface GraphErrorBody {
  error?: { message?: string; code?: number };
}

interface GraphAction {
  action_type: string;
  value: string;
}

interface GraphInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: GraphAction[];
  action_values?: GraphAction[];
  purchase_roas?: GraphAction[];
}

interface GraphInsightsResponse extends GraphErrorBody {
  data?: GraphInsightRow[];
}

interface GraphAccountResponse extends GraphErrorBody {
  name?: string;
  currency?: string;
}

/** Digits only, without "act_"; null when it can't be a real ad account id. */
export function normalizeAdAccountId(raw: string): string | null {
  const digits = raw.trim().replace(/^act_/i, "").replace(/\D/g, "");
  return digits.length >= 5 && digits.length <= 20 ? digits : null;
}

function num(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Meta reports a purchase under several action types depending on setup;
// "omni_purchase" is the all-channels total, the others are fallbacks.
const PURCHASE_ACTION_TYPES = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"] as const;

function pickPurchase(list: GraphAction[] | undefined): number {
  if (!list) return 0;
  for (const type of PURCHASE_ACTION_TYPES) {
    const hit = list.find((a) => a.action_type === type);
    if (hit) return num(hit.value);
  }
  return 0;
}

async function graphGet<T extends GraphErrorBody>(
  path: string,
  token: string,
  query: Record<string, string>,
): Promise<FacebookAdsResult<T>> {
  try {
    const url = `${GRAPH_BASE}/${path}?${new URLSearchParams(query).toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as T | null;

    if (!res.ok || !body || body.error) {
      const code = body?.error?.code;
      const message = body?.error?.message ?? `Facebook returned ${res.status}`;
      return { ok: false, error: message, reconnect: code === TOKEN_ERROR_CODE };
    }
    return { ok: true, data: body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach Facebook" };
  }
}

/** Looks up the ad account's name and currency — doubles as a check that the token works. */
export async function fetchAdAccountInfo(
  accountId: string,
  token: string,
): Promise<FacebookAdsResult<{ name: string; currency: string }>> {
  const res = await graphGet<GraphAccountResponse>(`act_${accountId}`, token, { fields: "name,currency" });
  if (!res.ok) return res;
  return { ok: true, data: { name: res.data.name ?? `act_${accountId}`, currency: res.data.currency ?? "" } };
}

const INSIGHT_FIELDS =
  "spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions,action_values,purchase_roas";

function rangeFor(period: AdsPeriod): string {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return JSON.stringify({ since: iso(since), until: iso(until) });
}

function toTotals(row: GraphInsightRow | undefined): FacebookAdsTotals {
  return {
    spend: num(row?.spend),
    impressions: num(row?.impressions),
    reach: num(row?.reach),
    clicks: num(row?.clicks),
    linkClicks: num(row?.inline_link_clicks),
    ctr: num(row?.ctr),
    cpc: num(row?.cpc),
    cpm: num(row?.cpm),
    frequency: num(row?.frequency),
    purchases: pickPurchase(row?.actions),
    purchaseValue: pickPurchase(row?.action_values),
    metaRoas: pickPurchase(row?.purchase_roas),
  };
}

/** Account totals, per-campaign rows and a per-day series for the period, fetched in parallel. */
export async function fetchAdInsights(
  accountId: string,
  token: string,
  period: AdsPeriod,
): Promise<FacebookAdsResult<Omit<FacebookAdsInsights, "accountName" | "currency">>> {
  const time_range = rangeFor(period);
  const path = `act_${accountId}/insights`;

  const [totalRes, campaignRes, dailyRes] = await Promise.all([
    graphGet<GraphInsightsResponse>(path, token, { fields: INSIGHT_FIELDS, time_range }),
    graphGet<GraphInsightsResponse>(path, token, {
      fields: `campaign_id,campaign_name,${INSIGHT_FIELDS}`,
      level: "campaign",
      time_range,
      limit: "100",
    }),
    graphGet<GraphInsightsResponse>(path, token, {
      fields: "spend,actions,action_values",
      time_increment: "1",
      time_range,
      limit: "100",
    }),
  ]);

  if (!totalRes.ok) return totalRes;
  if (!campaignRes.ok) return campaignRes;
  if (!dailyRes.ok) return dailyRes;

  const campaigns: FacebookAdsCampaign[] = (campaignRes.data.data ?? [])
    .map((row) => {
      const t = toTotals(row);
      const roas = t.metaRoas || (t.spend > 0 ? t.purchaseValue / t.spend : 0);
      return {
        id: row.campaign_id ?? row.campaign_name ?? "",
        name: row.campaign_name ?? "—",
        spend: t.spend,
        impressions: t.impressions,
        reach: t.reach,
        clicks: t.clicks,
        purchases: t.purchases,
        purchaseValue: t.purchaseValue,
        roas,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const daily: FacebookAdsDay[] = (dailyRes.data.data ?? [])
    .map((row) => ({
      date: row.date_start ?? "",
      spend: num(row.spend),
      purchases: pickPurchase(row.actions),
      purchaseValue: pickPurchase(row.action_values),
    }))
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { ok: true, data: { totals: toTotals(totalRes.data.data?.[0]), campaigns, daily } };
}
