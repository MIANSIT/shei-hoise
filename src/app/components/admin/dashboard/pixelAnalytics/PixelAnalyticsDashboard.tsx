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
  RefreshCw,
  Lock,
  AlertTriangle,
  ArrowRight,
  Server,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  getPixelAnalytics,
  PixelAnalyticsData,
  PixelPeriod,
  CampaignStats,
  SourceStats,
  ProductStat,
  startOf,
} from "@/lib/queries/pixelEvents/getPixelAnalytics";
import { getAdSpendProtectionCount } from "@/lib/queries/orders/getAdSpendProtectionCount";
import { getStoreCapiStatus, type StoreCapiStatus } from "@/lib/queries/stores/getStoreCapiStatus";
import { getStoreSubscription, type StoreSubscription } from "@/lib/queries/subscription/getStoreSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface Props {
  storeId: string;
  pixelId?: string | null;
}

const PERIODS: { label: string; value: PixelPeriod }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

function convRate(a: number, b: number) {
  if (!b) return "—";
  return `${((a / b) * 100).toFixed(1)}%`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

// Status chips use a fixed, reserved palette (good/warning/critical/neutral)
// that never doubles as the funnel's categorical blue — and always pair an
// icon or dot with the label, since color alone never carries the meaning.
const STATUS_STYLES = {
  good: { bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
  warning: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  critical: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  neutral: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500 dark:text-gray-400", dot: "bg-gray-400" },
} as const;

function StatusChip({
  label,
  state,
  text,
  icon: Icon,
  title,
}: {
  label: string;
  state: keyof typeof STATUS_STYLES;
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
}) {
  const style = STATUS_STYLES[state];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 text-xs font-medium pl-2.5 pr-3 py-1.5 rounded-full ${style.bg}`}
    >
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`inline-flex items-center gap-1 font-semibold ${style.text}`}>
        {Icon ? <Icon className="w-3 h-3" /> : <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
        {text}
      </span>
    </span>
  );
}

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
  eventMeta,
  n,
  fmtBDT,
  t,
}: {
  rows: [string, CampaignStats | SourceStats][];
  loading: boolean;
  accentColor: string;
  eventMeta: { key: string; label: string }[];
  n: (v: number | string) => string;
  fmtBDT: (v: number) => string;
  t: ReturnType<typeof useTranslation>;
}) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-xs min-w-160">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left font-semibold text-gray-500 dark:text-gray-400 pb-2 pr-4">
              {t.admin.pixelNameCol}
            </th>
            {eventMeta.map((m) => (
              <th
                key={m.key}
                className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap"
              >
                {m.label}
              </th>
            ))}
            <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
              {t.admin.pixelRevenueCol}
            </th>
            <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 pl-2 whitespace-nowrap">
              {t.admin.pixelConversionRate}
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
              {eventMeta.map((m) => (
                <td
                  key={m.key}
                  className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300"
                >
                  {loading ? "—" : n(stats.events[m.key] ?? 0)}
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

// ── Campaign UTM tagging tip ─────────────────────────────────────────────────
// Facebook lets a URL parameter use a dynamic macro ({{campaign.name}}) that
// it substitutes per-ad at serve time — so this exact string, unmodified,
// works on every ad. Surfaced with a one-click copy since store owners paste
// it into Ads Manager, not into this app.
const CAMPAIGN_UTM_SNIPPET = "utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}";

function CampaignTagTip({ t }: { t: ReturnType<typeof useTranslation> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CAMPAIGN_UTM_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the snippet is
      // still visible on screen to select and copy manually.
    }
  };

  return (
    <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3.5 mb-4">
      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          {t.admin.pixelCampaignTagTipTitle}
        </p>
        <p className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
          {t.admin.pixelCampaignTagTipDesc}
        </p>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-stretch gap-2">
          <code className="flex-1 min-w-0 text-[11px] bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-500/30 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 font-mono leading-relaxed break-all">
            {CAMPAIGN_UTM_SNIPPET}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-3 py-2 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t.admin.pixelCopied : t.admin.pixelCopyBtn}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-2 font-medium">
          {t.admin.pixelCampaignTagTipPath}
        </p>
      </div>
    </div>
  );
}

// ── Conversions API section ──────────────────────────────────────────────────
// Kept visually distinct (violet accent, its own card) from the Meta Pixel
// data above it, since CAPI is the paid upsell: store owners need to see at a
// glance what's included for free vs. what the subscription adds.

function CapiLockedCard({ t }: { t: ReturnType<typeof useTranslation> }) {
  return (
    <div className="relative rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/30 bg-linear-to-br from-violet-50 to-white dark:from-violet-500/5 dark:to-gray-900 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t.admin.pixelCapiSectionTitle}</h2>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-600 text-white px-2 py-0.5 rounded-full">
              {t.admin.pixelCapiBadgeLocked}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-lg leading-relaxed">
            {t.admin.pixelCapiLockedDesc}
          </p>
        </div>
      </div>

      <ul className="space-y-2 mb-5">
        {[t.admin.pixelCapiBenefit1, t.admin.pixelCapiBenefit2, t.admin.pixelCapiBenefit3].map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
            <CheckCircle className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{benefit}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/subscription/plans"
        className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
      >
        {t.admin.pixelCapiUnlockCta} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function CapiConnectPrompt({ t }: { t: ReturnType<typeof useTranslation> }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4">
      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t.admin.pixelCapiConnectPromptTitle}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.admin.pixelCapiConnectPromptDesc}</p>
      </div>
      <Link
        href="/dashboard/store-management#store-settings"
        className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {t.admin.pixelCapiConnectPromptCta} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function CapiSection({
  capiEntitled,
  capiConfigured,
  testModeActive,
  lastCapiError,
  totals,
  capiDelivered,
  eventMeta,
  n,
  t,
}: {
  capiEntitled: boolean;
  capiConfigured: boolean;
  testModeActive: boolean;
  lastCapiError: string | null | undefined;
  totals: Record<string, number>;
  capiDelivered: Record<string, number> | undefined;
  eventMeta: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[];
  n: (v: number | string) => string;
  t: ReturnType<typeof useTranslation>;
}) {
  if (!capiEntitled) return <CapiLockedCard t={t} />;

  const totalBrowser = eventMeta.reduce((sum, m) => sum + (totals[m.key] ?? 0), 0);
  const totalServer = eventMeta.reduce((sum, m) => sum + (capiDelivered?.[m.key] ?? 0), 0);
  const reliabilityPct = totalBrowser > 0 ? Math.round((totalServer / totalBrowser) * 100) : null;

  return (
    <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-linear-to-br from-violet-50/60 via-white to-white dark:from-violet-500/5 dark:via-gray-900 dark:to-gray-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
          <Server className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t.admin.pixelCapiSectionTitle}</h2>
        <StatusChip
          label=""
          state={lastCapiError ? "critical" : capiConfigured ? "good" : "warning"}
          text={
            lastCapiError
              ? t.admin.pixelHealthCapiError
              : capiConfigured
                ? t.admin.pixelCapiBadgeActive
                : t.admin.pixelCapiSetupNeeded
          }
          title={lastCapiError ?? undefined}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-lg leading-relaxed">
        {t.admin.pixelCapiSectionSubtitle}
      </p>

      {!capiConfigured ? (
        <CapiConnectPrompt t={t} />
      ) : (
        <>
          {testModeActive && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">{t.admin.pixelHealthTestMode}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t.admin.pixelHealthBrowserVsServer}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
                {t.admin.pixelHealthBrowserVsServerDesc}
              </p>
              <div className="space-y-2">
                {eventMeta.map((meta) => {
                  const browserCount = totals[meta.key] ?? 0;
                  const serverCount = capiDelivered?.[meta.key] ?? 0;
                  const pct = browserCount > 0 ? Math.round((serverCount / browserCount) * 100) : null;
                  const state: keyof typeof STATUS_STYLES =
                    pct === null ? "neutral" : pct >= 70 ? "good" : pct >= 30 ? "warning" : "neutral";
                  const style = STATUS_STYLES[state];
                  return (
                    <div key={meta.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-24 sm:w-28 shrink-0 text-gray-600 dark:text-gray-400 truncate">{meta.label}</span>
                        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full shrink-0 ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {pct === null ? "—" : `${pct}% ${t.admin.pixelHealthConfirmedSuffix}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:truncate">
                        {n(browserCount)} {t.admin.pixelHealthCoverageSeen} · {n(serverCount)} {t.admin.pixelHealthCoverageBackedUp}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-violet-100/60 dark:bg-violet-500/10 p-4 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-400 font-semibold">
                {t.admin.pixelCapiReliability}
              </p>
              <p className="text-2xl font-black text-violet-700 dark:text-violet-400 mt-1">
                {reliabilityPct === null ? "—" : `${reliabilityPct}%`}
              </p>
              <p className="text-xs text-violet-700/80 dark:text-violet-400/80 mt-1">
                {n(totalServer)} / {n(totalBrowser)} {t.admin.pixelCapiEventsConfirmed}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function PixelAnalyticsDashboard({ storeId, pixelId }: Props) {
  const [period, setPeriod] = useState<PixelPeriod>("7d");
  const [data, setData] = useState<PixelAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [capiStatus, setCapiStatus] = useState<StoreCapiStatus>({ hasToken: false, testEventCode: null });
  const [adSpendProtected, setAdSpendProtected] = useState(0);
  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIcon } = useUserCurrencyIcon();

  useEffect(() => {
    getStoreSubscription(storeId).then(setSubscription);
    getStoreCapiStatus(storeId).then(setCapiStatus);
  }, [storeId]);

  useEffect(() => {
    getAdSpendProtectionCount(storeId, startOf(period)).then(setAdSpendProtected);
  }, [storeId, period]);

  const capiEntitled = hasFeature(subscription, "conversion_api");
  const pixelEntitled = hasFeature(subscription, "meta_pixel");
  const capiConfigured = capiStatus.hasToken;
  const testModeActive = !!capiStatus.testEventCode;

  // Funnel stages are ordinal (order carries meaning), so they share one hue
  // stepping darker as the customer commits further — not a different color
  // per stage. Purchase breaks the ramp on purpose: it's the outcome that
  // means revenue, so it wears the same "good/success" green used elsewhere
  // in the app (paid, delivered), not the next step of the funnel ramp.
  const EVENT_META = [
    { key: "PageView", label: t.admin.pixelPageViews, icon: Eye, color: "text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-100 dark:border-blue-500/20", bar: "from-blue-300 to-blue-400", chartColor: "#93c5fd" },
    { key: "ViewContent", label: t.admin.pixelProductViews, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-100 dark:border-blue-500/20", bar: "from-blue-400 to-blue-500", chartColor: "#60a5fa" },
    { key: "AddToCart", label: t.admin.pixelAddToCart, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-100 dark:border-blue-500/20", bar: "from-blue-500 to-blue-600", chartColor: "#3b82f6" },
    { key: "InitiateCheckout", label: t.admin.pixelCheckoutStarted, icon: CreditCard, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-100 dark:border-blue-500/20", bar: "from-blue-600 to-blue-700", chartColor: "#2563eb" },
    { key: "Purchase", label: t.admin.pixelPurchases, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-100 dark:border-emerald-500/20", bar: "from-emerald-500 to-emerald-600", chartColor: "#10b981" },
  ];

  const fmtBDT = (val: number) => {
    const sym = typeof currencyIcon === "string" ? currencyIcon : "৳";
    return `${sym} ${n(Math.round(val).toString())}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPixelAnalytics(storeId, period);
      setData(result);
    } catch (error) {
      console.error("Failed to load pixel analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals ?? {};
  const daily = data?.daily ?? [];

  // ── No pixel configured — locked (plan doesn't include it) vs. just not set up yet ──
  if (!pixelId) {
    if (!pixelEntitled) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t.admin.pixelLockedTitle}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t.admin.pixelLockedHint}
            </p>
            <Link
              href="/dashboard/subscription/plans"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {t.admin.pixelUpgradePlan} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {t.admin.pixelNoPixel}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.admin.pixelNoPixelHint}
          </p>
        </div>
      </div>
    );
  }

  const sorted_campaigns = data?.campaigns ? Object.entries(data.campaigns).sort((a, b) => b[1].revenue - a[1].revenue || b[1].total - a[1].total) : [];
  const sorted_sources = data?.sources ? Object.entries(data.sources).sort((a, b) => b[1].revenue - a[1].revenue || b[1].total - a[1].total) : [];

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
              {t.admin.pixelTitle}
            </h1>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t.admin.pixelIdLabel}{" "}
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
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
              {t.admin.pixelTrackedRevenue}
            </p>
            <p className="text-3xl sm:text-4xl font-black">
              {fmtBDT(data?.totalRevenue ?? 0)}
            </p>
            <p className="text-indigo-200 text-xs mt-1">
              {t.admin.pixelFromPurchases.includes("purchases")
                ? `${t.admin.pixelFromPurchases.replace("purchases", n(data?.totalOrders ?? 0) + " purchases")}`
                : `${n(data?.totalOrders ?? 0)} ${t.admin.pixelFromPurchases}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <p className="text-lg font-black">
                {data?.totalOrders
                  ? `${n(((data.totalOrders / (totals.PageView || 1)) * 100).toFixed(2))}%`
                  : "—"}
              </p>
              <p className="text-indigo-200 text-[10px] font-medium mt-0.5">
                {t.admin.pixelVisitToBuy}
              </p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <p className="text-lg font-black">
                {data?.avgOrderValue ? fmtBDT(Math.round(data.avgOrderValue)) : "—"}
              </p>
              <p className="text-indigo-200 text-[10px] font-medium mt-0.5">
                {t.admin.pixelAvgOrder}
              </p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <p className="text-lg font-black">
                {data?.avgItemsPerOrder
                  ? n(data.avgItemsPerOrder.toFixed(1))
                  : "—"}
              </p>
              <p className="text-indigo-200 text-[10px] font-medium mt-0.5">
                {t.admin.pixelItemsPerOrder}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Connection Health (status colors: good/warning/critical/neutral — never the funnel's blue) ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatusChip
            label={t.admin.pixelHealthPixel}
            state={pixelId ? "good" : "neutral"}
            text={pixelId ? t.admin.pixelHealthConnected : t.admin.pixelHealthNotConnected}
          />
          <StatusChip label={t.admin.pixelHealthCatalog} state="good" text={t.admin.pixelHealthCatalogAvailable} />
          <Link
            href="/dashboard/store-management#store-settings"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 ml-auto"
          >
            {t.admin.pixelHealthCatalogCta} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-4">
          <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">{t.admin.pixelHealthAdSpendProtection}</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{n(adSpendProtected)}</p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">{t.admin.pixelHealthAdSpendProtectionDesc}</p>
        </div>
      </div>

      {/* ── Conversions API (separated on purpose: this is the paid upsell, distinct from Meta Pixel below) ── */}
      <CapiSection
        capiEntitled={capiEntitled}
        capiConfigured={capiConfigured}
        testModeActive={testModeActive}
        lastCapiError={data?.lastCapiError}
        totals={totals}
        capiDelivered={data?.capiDelivered}
        eventMeta={EVENT_META}
        n={n}
        t={t}
      />

      {/* ── Meta Pixel section divider ── */}
      <div className="flex items-center gap-2 pt-2">
        <div className="w-1 h-5 rounded-full bg-linear-to-b from-blue-400 to-blue-600" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t.admin.pixelSectionMetaPixelTitle}</h2>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{t.admin.pixelSectionMetaPixelSubtitle}</span>
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
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {loading ? "—" : n(count)}
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
        <SectionHeader gradient="from-blue-400 to-blue-600" title={t.admin.pixelConversionFunnel} />
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
                        {convRate(count, prev)} {t.admin.pixelFromPrev}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
                    {loading ? "—" : n(count)}
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

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {loading ? "—" : convRate(data?.totalOrders ?? 0, totals.AddToCart ?? 0)}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t.admin.pixelCartToBuyRate}</p>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {loading ? "—" : convRate(data?.totalOrders ?? 0, totals.ViewContent ?? 0)}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t.admin.pixelViewToBuyRate}</p>
          </div>
        </div>
      </div>

      {/* ── Daily Trend Chart ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <SectionHeader gradient="from-blue-400 to-blue-600" title={t.admin.pixelDailyTrend} />
        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : daily.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            {t.admin.pixelNoPeriodData}
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
              <CartesianGrid stroke="#e5e7eb" strokeOpacity={0.6} vertical={false} />
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

      {/* ── Traffic Sources ── */}
      {data?.sources && Object.keys(data.sources).length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <SectionHeader
            gradient="from-sky-400 to-blue-500"
            title={t.admin.pixelTrafficSources}
            right={
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {n(sorted_sources.length)}{" "}
                {sorted_sources.length !== 1 ? t.admin.pixelSourcePlural : t.admin.pixelSourceSingular}
              </span>
            }
          />
          <StatTable rows={sorted_sources} loading={loading} accentColor="bg-sky-400" eventMeta={EVENT_META} n={n} fmtBDT={fmtBDT} t={t} />
        </div>
      )}

      {/* ── Top Products ── */}
      {data?.topProducts && data.topProducts.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <SectionHeader
            gradient="from-violet-400 to-purple-500"
            title={t.admin.pixelTopProducts}
            right={
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {t.admin.pixelByRevenue}
              </span>
            }
          />
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs min-w-120">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left font-semibold text-gray-500 dark:text-gray-400 pb-2 pr-4">
                    {t.admin.pixelProductCol}
                  </th>
                  <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                    {t.admin.pixelViewsCol}
                  </th>
                  <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                    {t.admin.pixelAddToCartCol}
                  </th>
                  <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                    {t.admin.pixelPurchasesCol}
                  </th>
                  <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 px-2 whitespace-nowrap">
                    {t.admin.pixelRevenueCol}
                  </th>
                  <th className="text-right font-semibold text-gray-500 dark:text-gray-400 pb-2 pl-2 whitespace-nowrap">
                    {t.admin.pixelViewToBuy}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {(data.topProducts as ProductStat[]).map((p) => (
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
                      {loading ? "—" : n(p.views)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {loading ? "—" : n(p.cartAdds)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {loading ? "—" : n(p.purchases)}
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
      )}

      {/* ── Campaign Breakdown ── */}
      {data?.campaigns && Object.keys(data.campaigns).length > 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <SectionHeader
            gradient="from-pink-400 to-rose-500"
            title={t.admin.pixelCampaignBreakdown}
            right={
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {n(sorted_campaigns.length)}{" "}
                {sorted_campaigns.length !== 1 ? t.admin.pixelCampaignPlural : t.admin.pixelCampaignSingular}
              </span>
            }
          />
          <CampaignTagTip t={t} />
          <StatTable rows={sorted_campaigns} loading={loading} accentColor="bg-rose-400" eventMeta={EVENT_META} n={n} fmtBDT={fmtBDT} t={t} />
        </div>
      ) : (
        !loading && (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-5">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t.admin.pixelNoCampaignTitle}
            </p>
            <CampaignTagTip t={t} />
          </div>
        )
      )}
    </div>
  );
}
