"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Eye,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Globe,
  Package,
  Info,
} from "lucide-react";
import {
  getPixelAnalytics,
  PixelAnalyticsData,
  PixelPeriod,
  CampaignStats,
  SourceStats,
  ProductStat,
} from "@/lib/queries/pixelEvents/getPixelAnalytics";

interface Props {
  storeId: string;
  pixelId?: string | null;
}

const EVENT_META = [
  {
    key: "PageView",
    label: "Page Views",
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-100 dark:border-blue-500/20",
    bar: "from-blue-400 to-blue-600",
    chartColor: "#3b82f6",
  },
  {
    key: "ViewContent",
    label: "Product Views",
    icon: ShoppingBag,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    border: "border-indigo-100 dark:border-indigo-500/20",
    bar: "from-indigo-400 to-indigo-600",
    chartColor: "#6366f1",
  },
  {
    key: "AddToCart",
    label: "Add to Cart",
    icon: ShoppingCart,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-100 dark:border-amber-500/20",
    bar: "from-amber-400 to-amber-600",
    chartColor: "#f59e0b",
  },
  {
    key: "InitiateCheckout",
    label: "Checkout Started",
    icon: CreditCard,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-100 dark:border-orange-500/20",
    bar: "from-orange-400 to-orange-600",
    chartColor: "#f97316",
  },
  {
    key: "Purchase",
    label: "Purchases",
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-100 dark:border-emerald-500/20",
    bar: "from-emerald-400 to-emerald-600",
    chartColor: "#10b981",
  },
];

const PERIODS: { label: string; value: PixelPeriod }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

function fmt(n: number) {
  return n.toLocaleString("en-BD");
}

function fmtBDT(n: number) {
  return `৳ ${n.toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}

function convRate(a: number, b: number) {
  if (!b) return "—";
  return `${((a / b) * 100).toFixed(1)}%`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  gradient,
  title,
  right,
}: {
  gradient: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className={`w-1 h-5 rounded-full bg-linear-to-b ${gradient}`} />
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

function StatTable({
  rows,
  loading,
  accentColor,
}: {
  rows: [string, CampaignStats | SourceStats][];
  loading: boolean;
  accentColor: string;
}) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-xs min-w-160">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left font-semibold text-gray-500 dark:text-gray-400 pb-2 pr-4">
              Name
            </th>
            {EVENT_META.map((m) => (
              <th
                key={m.key}
                className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap"
              >
                {m.label}
              </th>
            ))}
            <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
              Revenue
            </th>
            <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 pl-2 whitespace-nowrap">
              Conv.
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {rows.map(([name, stats]) => (
            <tr
              key={name}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-200 max-w-45">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${accentColor} shrink-0`} />
                  <span className="truncate">{name}</span>
                </span>
              </td>
              {EVENT_META.map((m) => (
                <td
                  key={m.key}
                  className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300"
                >
                  {loading ? "—" : fmt(stats.events[m.key] ?? 0)}
                </td>
              ))}
              <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {loading
                  ? "—"
                  : stats.revenue > 0
                    ? fmtBDT(stats.revenue)
                    : "—"}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                {loading
                  ? "—"
                  : convRate(
                      stats.events["Purchase"] ?? 0,
                      stats.events["PageView"] ?? 0
                    )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignBreakdown({
  campaigns,
  loading,
}: {
  campaigns: Record<string, CampaignStats>;
  loading: boolean;
}) {
  const sorted = Object.entries(campaigns).sort(
    (a, b) => b[1].revenue - a[1].revenue || b[1].total - a[1].total
  );

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <SectionHeader
        gradient="from-pink-400 to-rose-500"
        title="Campaign Breakdown"
        right={
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {sorted.length} campaign{sorted.length !== 1 ? "s" : ""}
          </span>
        }
      />
      <StatTable rows={sorted} loading={loading} accentColor="bg-rose-400" />
    </div>
  );
}

function NoCampaignHint() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            No campaign data tracked yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            To see per-campaign stats, add UTM parameters to your Facebook Ad URLs.
            In Ads Manager, go to your ad → <strong>Website URL</strong> and append:
          </p>
          <code className="mt-2 block text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 font-mono leading-relaxed break-all">
            ?utm_source=facebook&amp;utm_medium=cpc&amp;utm_campaign=YOUR_CAMPAIGN_NAME
          </code>
        </div>
      </div>
    </div>
  );
}

function TrafficSources({
  sources,
  loading,
}: {
  sources: Record<string, SourceStats>;
  loading: boolean;
}) {
  const sorted = Object.entries(sources).sort(
    (a, b) => b[1].revenue - a[1].revenue || b[1].total - a[1].total
  );

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <SectionHeader
        gradient="from-sky-400 to-blue-500"
        title="Traffic Sources"
        right={
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {sorted.length} source{sorted.length !== 1 ? "s" : ""}
          </span>
        }
      />
      <StatTable rows={sorted} loading={loading} accentColor="bg-sky-400" />
    </div>
  );
}

function TopProducts({
  products,
  loading,
}: {
  products: ProductStat[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <SectionHeader
        gradient="from-violet-400 to-purple-500"
        title="Top Products"
        right={
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            by revenue
          </span>
        }
      />
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs min-w-120">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left font-semibold text-gray-500 dark:text-gray-400 pb-2 pr-4">
                Product
              </th>
              <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                Views
              </th>
              <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                Add to Cart
              </th>
              <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                Purchases
              </th>
              <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                Revenue
              </th>
              <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 pl-2 whitespace-nowrap">
                View→Buy
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {products.map((p) => (
              <tr
                key={p.name}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-200 max-w-48">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {loading ? "—" : fmt(p.views)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {loading ? "—" : fmt(p.cartAdds)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {loading ? "—" : fmt(p.purchases)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {loading ? "—" : p.revenue > 0 ? fmtBDT(p.revenue) : "—"}
                </td>
                <td className="py-2.5 pl-2 text-right tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                  {loading ? "—" : convRate(p.purchases, p.views)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function PixelAnalyticsDashboard({ storeId, pixelId }: Props) {
  const [period, setPeriod] = useState<PixelPeriod>("7d");
  const [data, setData] = useState<PixelAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getPixelAnalytics(storeId, period);
    setData(result);
    setLoading(false);
  }, [storeId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals ?? {};
  const daily = data?.daily ?? [];

  // ── No pixel configured ──────────────────────────────────────────────────────
  if (!pixelId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No Pixel Connected
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Go to{" "}
            <strong>Store Settings → Facebook Pixel ID</strong> and paste your
            Meta Pixel ID to start tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-350 mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Pixel Analytics
            </h1>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Pixel ID:{" "}
            <span className="font-mono text-gray-600 dark:text-gray-300">
              {pixelId}
            </span>
          </p>
        </div>

        {/* Period + Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 text-xs font-semibold transition-colors ${
                  period === p.value
                    ? "bg-indigo-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Revenue Hero ── */}
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-indigo-500 via-indigo-600 to-violet-600 p-5 sm:p-7 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
              Tracked Revenue
            </p>
            <p className="text-3xl sm:text-4xl font-black tabular-nums">
              {fmtBDT(data?.totalRevenue ?? 0)}
            </p>
            <p className="text-indigo-200 text-xs mt-1">
              From {fmt(data?.totalOrders ?? 0)} purchases via pixel
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <p className="text-lg font-black">
                {data?.totalOrders
                  ? `${(((data.totalOrders) / (totals.PageView || 1)) * 100).toFixed(2)}%`
                  : "—"}
              </p>
              <p className="text-indigo-200 text-[10px] font-medium mt-0.5">
                Visit→Buy
              </p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <p className="text-lg font-black">
                {data?.avgOrderValue ? fmtBDT(Math.round(data.avgOrderValue)) : "—"}
              </p>
              <p className="text-indigo-200 text-[10px] font-medium mt-0.5">
                Avg Order
              </p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <p className="text-lg font-black">
                {data?.avgItemsPerOrder
                  ? data.avgItemsPerOrder.toFixed(1)
                  : "—"}
              </p>
              <p className="text-indigo-200 text-[10px] font-medium mt-0.5">
                Items/Order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {EVENT_META.map((meta) => {
          const count = totals[meta.key] ?? 0;
          const Icon = meta.icon;
          return (
            <div
              key={meta.key}
              className={`relative rounded-2xl border ${meta.border} ${meta.bg} p-4 overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${meta.bar}`} />
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900/50 flex items-center justify-center mb-3 shadow-sm">
                <Icon className={`w-4 h-4 ${meta.color}`} />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                {loading ? "—" : fmt(count)}
              </p>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                {meta.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Conversion Funnel ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <SectionHeader gradient="from-indigo-400 to-violet-500" title="Conversion Funnel" />
        <div className="space-y-2">
          {EVENT_META.map((meta, i) => {
            const count = totals[meta.key] ?? 0;
            const max = totals["PageView"] || 1;
            const pct = max > 0 ? (count / max) * 100 : 0;
            const prev = i > 0 ? (totals[EVENT_META[i - 1].key] ?? 0) : null;
            return (
              <div key={meta.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {meta.label}
                    </span>
                    {prev !== null && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                        {convRate(count, prev)} from prev
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
                    {loading ? "—" : fmt(count)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-linear-to-r ${meta.bar} transition-all duration-700`}
                    style={{ width: loading ? "0%" : `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Daily Trend Chart ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <SectionHeader gradient="from-blue-400 to-indigo-500" title="Daily Trend" />
        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : daily.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No data for this period yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {EVENT_META.map((m) => (
                  <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.chartColor} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={m.chartColor} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card, #fff)",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {EVENT_META.map((m) => (
                <Area
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.chartColor}
                  strokeWidth={2}
                  fill={`url(#grad-${m.key})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Revenue + Order Stats ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <SectionHeader gradient="from-emerald-400 to-teal-500" title="Revenue & Orders" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Total Revenue",
              value: fmtBDT(data?.totalRevenue ?? 0),
              icon: DollarSign,
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-500/10",
            },
            {
              label: "Total Orders",
              value: fmt(data?.totalOrders ?? 0),
              icon: CheckCircle,
              color: "text-blue-500",
              bg: "bg-blue-50 dark:bg-blue-500/10",
            },
            {
              label: "Avg Order Value",
              value: data?.avgOrderValue ? fmtBDT(Math.round(data.avgOrderValue)) : "—",
              icon: TrendingUp,
              color: "text-indigo-500",
              bg: "bg-indigo-50 dark:bg-indigo-500/10",
            },
            {
              label: "Avg Items/Order",
              value: data?.avgItemsPerOrder ? data.avgItemsPerOrder.toFixed(1) : "—",
              icon: Package,
              color: "text-violet-500",
              bg: "bg-violet-50 dark:bg-violet-500/10",
            },
            {
              label: "Cart→Buy Rate",
              value: convRate(data?.totalOrders ?? 0, totals.AddToCart ?? 0),
              icon: ShoppingCart,
              color: "text-amber-500",
              bg: "bg-amber-50 dark:bg-amber-500/10",
            },
            {
              label: "View→Buy Rate",
              value: convRate(data?.totalOrders ?? 0, totals.ViewContent ?? 0),
              icon: Globe,
              color: "text-rose-500",
              bg: "bg-rose-50 dark:bg-rose-500/10",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-xl ${item.bg} p-4`}>
                <Icon className={`w-5 h-5 ${item.color} mb-2`} />
                <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                  {loading ? "—" : item.value}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Traffic Sources ── */}
      {data?.sources && Object.keys(data.sources).length > 0 && (
        <TrafficSources sources={data.sources} loading={loading} />
      )}

      {/* ── Top Products ── */}
      {data?.topProducts && data.topProducts.length > 0 && (
        <TopProducts products={data.topProducts} loading={loading} />
      )}

      {/* ── Campaign Breakdown ── */}
      {data?.campaigns && Object.keys(data.campaigns).length > 0 ? (
        <CampaignBreakdown campaigns={data.campaigns} loading={loading} />
      ) : (
        !loading && <NoCampaignHint />
      )}
    </div>
  );
}
