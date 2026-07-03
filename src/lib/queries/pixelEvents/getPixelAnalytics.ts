import { supabase } from "@/lib/supabase";

export type PixelPeriod = "7d" | "30d" | "90d";

export interface PixelEventCount {
  event_name: string;
  count: number;
}

export interface PixelDailyCount {
  date: string;
  PageView: number;
  ViewContent: number;
  AddToCart: number;
  InitiateCheckout: number;
  Purchase: number;
}

export interface CampaignStats {
  total: number;
  events: Record<string, number>;
  revenue: number;
}

export interface SourceStats {
  total: number;
  events: Record<string, number>;
  revenue: number;
}

export interface ProductStat {
  name: string;
  views: number;
  cartAdds: number;
  purchases: number;
  revenue: number;
}

export interface PixelAnalyticsData {
  totals: Record<string, number>;
  daily: PixelDailyCount[];
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  avgItemsPerOrder: number;
  period: PixelPeriod;
  campaigns?: Record<string, CampaignStats>;
  sources?: Record<string, SourceStats>;
  topProducts?: ProductStat[];
  capiDelivered: Record<string, number>;
  lastCapiError: string | null;
  lastCapiDeliveredAt: string | null;
}

const EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

export function startOf(period: PixelPeriod): string {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function makeEventMap(): Record<string, number> {
  const m: Record<string, number> = {};
  EVENTS.forEach((e) => (m[e] = 0));
  return m;
}

function getSourceLabel(meta: Record<string, unknown> | null): string {
  if (!meta) return "Direct / Organic";
  if (meta.utm_source) return String(meta.utm_source);
  if (meta.fbclid) return "Facebook (Ad)";
  return "Direct / Organic";
}

type PixelRow = {
  event_name: string;
  metadata: unknown;
  created_at: string;
  capi_delivered: boolean | null;
  capi_error: string | null;
};

const PAGE_SIZE = 1000;

async function fetchAllEvents(storeId: string, since: string): Promise<PixelRow[]> {
  const rows: PixelRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("pixel_events")
      .select("event_name, metadata, created_at, capi_delivered, capi_error")
      .eq("store_id", storeId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;
    rows.push(...(data as PixelRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function getPixelAnalytics(
  storeId: string,
  period: PixelPeriod = "7d"
): Promise<PixelAnalyticsData> {
  const since = startOf(period);

  const data = await fetchAllEvents(storeId, since);

  if (data.length === 0) {
    return {
      totals: {},
      daily: [],
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      avgItemsPerOrder: 0,
      period,
      capiDelivered: {},
      lastCapiError: null,
      lastCapiDeliveredAt: null,
    };
  }

  // --- Totals ---
  const totals: Record<string, number> = {};
  const capiDelivered: Record<string, number> = {};
  EVENTS.forEach((e) => {
    totals[e] = 0;
    capiDelivered[e] = 0;
  });
  let lastCapiError: string | null = null;
  let lastCapiDeliveredAt: string | null = null;
  data.forEach((row) => {
    if (totals[row.event_name] !== undefined) totals[row.event_name]++;
    if (row.capi_delivered && capiDelivered[row.event_name] !== undefined) {
      capiDelivered[row.event_name]++;
      lastCapiDeliveredAt = row.created_at;
    }
    // Rows are fetched oldest-first, so this ends up reflecting the most
    // recent row that actually attempted a CAPI send (delivered or not) —
    // a later success correctly clears an earlier failure, instead of one
    // old error staying stuck on screen for the rest of the period.
    if (row.capi_delivered || row.capi_error) lastCapiError = row.capi_error;
  });

  // --- Campaign breakdown (utm_campaign / campaign key in metadata) ---
  const campaigns: Record<string, CampaignStats> = {};

  // --- Source breakdown (utm_source, or fbclid → "Facebook (Ad)", else "Direct / Organic") ---
  const sources: Record<string, SourceStats> = {};

  // --- Top products (from content_name in ViewContent / AddToCart / Purchase) ---
  const productMap: Record<string, ProductStat> = {};

  // --- Order-level stats ---
  let totalItems = 0;
  let orderCount = 0;

  data.forEach((row) => {
    const meta = row.metadata as Record<string, unknown> | null;

    // Campaign
    const campaignName = (meta && (meta["utm_campaign"] || meta["campaign"])) as string | undefined;
    if (campaignName) {
      if (!campaigns[campaignName]) {
        campaigns[campaignName] = { total: 0, events: makeEventMap(), revenue: 0 };
      }
      campaigns[campaignName].total++;
      if (row.event_name in campaigns[campaignName].events) {
        campaigns[campaignName].events[row.event_name]++;
      }
      if (row.event_name === "Purchase") {
        campaigns[campaignName].revenue += Number(meta?.value) || 0;
      }
    }

    // Source
    const sourceLabel = getSourceLabel(meta);
    if (!sources[sourceLabel]) {
      sources[sourceLabel] = { total: 0, events: makeEventMap(), revenue: 0 };
    }
    sources[sourceLabel].total++;
    if (row.event_name in sources[sourceLabel].events) {
      sources[sourceLabel].events[row.event_name]++;
    }
    if (row.event_name === "Purchase") {
      sources[sourceLabel].revenue += Number(meta?.value) || 0;
    }

    // Products
    const productName = meta?.content_name as string | undefined;
    if (productName && ["ViewContent", "AddToCart", "Purchase"].includes(row.event_name)) {
      if (!productMap[productName]) {
        productMap[productName] = { name: productName, views: 0, cartAdds: 0, purchases: 0, revenue: 0 };
      }
      if (row.event_name === "ViewContent") productMap[productName].views++;
      if (row.event_name === "AddToCart") productMap[productName].cartAdds++;
      if (row.event_name === "Purchase") {
        productMap[productName].purchases++;
        productMap[productName].revenue += Number(meta?.value) || 0;
      }
    }

    // Order stats
    if (row.event_name === "Purchase") {
      orderCount++;
      totalItems += Number(meta?.num_items) || 1;
    }
  });

  // --- Daily breakdown ---
  const dayMap: Record<string, PixelDailyCount> = {};
  data.forEach((row) => {
    const date = row.created_at.slice(0, 10);
    if (!dayMap[date]) {
      dayMap[date] = { date, PageView: 0, ViewContent: 0, AddToCart: 0, InitiateCheckout: 0, Purchase: 0 };
    }
    const key = row.event_name as keyof Omit<PixelDailyCount, "date">;
    if (key in dayMap[date]) (dayMap[date][key] as number)++;
  });
  const daily = Object.values(dayMap);

  // --- Revenue from Purchase events ---
  const totalRevenue = data
    .filter((r) => r.event_name === "Purchase")
    .reduce((sum, r) => sum + (Number((r.metadata as Record<string, unknown>)?.value) || 0), 0);

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue || b.purchases - a.purchases || b.views - a.views)
    .slice(0, 10);

  return {
    totals,
    daily,
    totalRevenue,
    totalOrders: orderCount,
    avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
    avgItemsPerOrder: orderCount > 0 ? totalItems / orderCount : 0,
    period,
    campaigns: Object.keys(campaigns).length > 0 ? campaigns : undefined,
    sources,
    topProducts: topProducts.length > 0 ? topProducts : undefined,
    capiDelivered,
    lastCapiError,
    lastCapiDeliveredAt,
  };
}
