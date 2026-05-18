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

export interface PixelAnalyticsData {
  totals: Record<string, number>;
  daily: PixelDailyCount[];
  totalRevenue: number;
  period: PixelPeriod;
}

const EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

function startOf(period: PixelPeriod): string {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getPixelAnalytics(
  storeId: string,
  period: PixelPeriod = "7d"
): Promise<PixelAnalyticsData> {
  const since = startOf(period);

  const { data, error } = await supabase
    .from("pixel_events")
    .select("event_name, metadata, created_at")
    .eq("store_id", storeId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { totals: {}, daily: [], totalRevenue: 0, period };
  }

  // --- Totals ---
  const totals: Record<string, number> = {};
  EVENTS.forEach((e) => (totals[e] = 0));
  data.forEach((row) => {
    if (totals[row.event_name] !== undefined) totals[row.event_name]++;
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

  return { totals, daily, totalRevenue, period };
}
