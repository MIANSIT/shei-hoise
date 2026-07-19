import type { TimePeriod } from "@/lib/hook/useDashboardMetrics";

const STORE_TIMEZONE = "Asia/Dhaka";

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
  const spanDays = period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
  const today = toDhakaDateString(new Date());

  const periodEnd = today;
  const periodStart = addDays(today, -(spanDays - 1));
  const prevPeriodEnd = addDays(periodStart, -1);
  const prevPeriodStart = addDays(prevPeriodEnd, -(spanDays - 1));

  return { periodStart, periodEnd, prevPeriodStart, prevPeriodEnd };
}
