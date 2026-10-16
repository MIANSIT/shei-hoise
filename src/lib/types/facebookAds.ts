export type AdsPeriod = "7d" | "30d" | "90d";

export interface FacebookAdsStatus {
  connected: boolean;
  /** Digits only, without the act_ prefix. */
  accountId: string | null;
}

export interface FacebookAdsTotals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  /** Purchases Meta attributes to the ads. */
  purchases: number;
  purchaseValue: number;
  /** Return on ad spend as Meta reports it (0 when Meta has none). */
  metaRoas: number;
}

export interface FacebookAdsCampaign {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
}

export interface FacebookAdsDay {
  /** YYYY-MM-DD */
  date: string;
  spend: number;
  purchases: number;
  purchaseValue: number;
}

export interface FacebookAdsInsights {
  accountName: string;
  /** ISO currency code of the ad account (spend is in this currency, not necessarily the store's). */
  currency: string;
  totals: FacebookAdsTotals;
  campaigns: FacebookAdsCampaign[];
  daily: FacebookAdsDay[];
}

export type FacebookAdsResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      /** True when Meta rejected the token — the owner needs to paste a new one. */
      reconnect?: boolean;
    };
