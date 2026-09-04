import type { TimePeriod } from "@/lib/hook/useDashboardMetrics";

const STORE_TIMEZONE = "Asia/Dhaka";

/** Earlier than the platform itself, so "all time" genuinely means all time. */
const ALL_TIME_START = "2020-01-01";

export interface DashboardPeriodRange {
  periodStart: string;
  periodEnd: string;
  prevPeriodStart: string;
  prevPeriodEnd: string;
}

const toDhakaDateString = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Computes the current/previous period date ranges (in the store's own
 * Asia/Dhaka business day, not the viewer's local timezone) for a given
 * TimePeriod, matching dashboard_daily_metrics' summary_date bucketing.
 * @returns ISO date strings (YYYY-MM-DD) for the current and previous period bounds.
 */
export function getDashboardPeriodRange(period: TimePeriod): DashboardPeriodRange {
  const today = toDhakaDateString(new Date());

  // "All time" reaches back further than any store on the platform, so every
  // order, expense and settlement is counted whatever the store's age. There is
  // no prior window to compare against — the previous range is deliberately
  // zero-width so every prev_* total comes back 0, and the UI drops the
  // comparison line rather than claiming a meaningless "+100% vs previous".
  if (period === "all") {
    return {
      periodStart: ALL_TIME_START,
      periodEnd: today,
      prevPeriodStart: ALL_TIME_START,
      prevPeriodEnd: ALL_TIME_START,
    };
  }

  const spanDays = period === "weekly" ? 7 : period === "monthly" ? 30 : 365;

  const periodEnd = today;
  const periodStart = addDays(today, -(spanDays - 1));
  const prevPeriodEnd = addDays(periodStart, -1);
  const prevPeriodStart = addDays(prevPeriodEnd, -(spanDays - 1));

  return { periodStart, periodEnd, prevPeriodStart, prevPeriodEnd };
}
