"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Megaphone, Plug, Unplug } from "lucide-react";
import {
  connectFacebookAds,
  disconnectFacebookAds,
  getFacebookAdsInsights,
  getFacebookAdsStatus,
} from "@/lib/queries/facebookAds/facebookAds";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import type { AdsPeriod, FacebookAdsInsights, FacebookAdsStatus } from "@/lib/types/facebookAds";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface FacebookAdsSectionProps {
  storeId: string;
  period: AdsPeriod;
  /** Sales the store tracked in the same period, for the "sales per 1 spent" figure. */
  trackedRevenue: number;
}

const INPUT_CLASS =
  "w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 py-2 rounded-lg text-sm outline-none text-foreground";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3.5" title={hint}>
      <p className="text-lg font-black text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function FacebookAdsSection({ storeId, period, trackedRevenue }: FacebookAdsSectionProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const notify = useSheiNotification();

  const [status, setStatus] = useState<FacebookAdsStatus | null>(null);
  const [insights, setInsights] = useState<FacebookAdsInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getFacebookAdsStatus(storeId).then(setStatus);
    getStoreSettings(storeId).then((s) => setStoreCurrency(s?.currency ?? null));
  }, [storeId]);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getFacebookAdsInsights(storeId, period);
      if (res.ok) {
        setInsights(res.data);
        setNeedsReconnect(false);
      } else {
        setInsights(null);
        setLoadError(res.error);
        setNeedsReconnect(Boolean(res.reconnect));
      }
    } catch {
      setInsights(null);
      setLoadError(t.admin.adsLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [storeId, period, t.admin.adsLoadFailed]);

  useEffect(() => {
    if (status?.connected) loadInsights();
  }, [status?.connected, loadInsights]);

  const handleConnect = async () => {
    setConnecting(true);
    setFormError(null);
    try {
      const res = await connectFacebookAds(storeId, accountId, token);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setToken("");
      setAccountId("");
      setNeedsReconnect(false);
      notify.success(t.admin.adsConnectedToast);
      const wasConnected = status?.connected === true;
      setStatus(await getFacebookAdsStatus(storeId));
      // A first connection flips `connected`, which triggers the load effect;
      // replacing a rejected token leaves it true, so reload by hand.
      if (wasConnected) await loadInsights();
    } catch {
      setFormError(t.admin.adsLoadFailed);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const res = await disconnectFacebookAds(storeId);
    if (!res.ok) {
      notify.error(t.admin.adsDisconnectFail);
      return;
    }
    setInsights(null);
    setLoadError(null);
    setStatus({ connected: false, accountId: null });
    notify.success(t.admin.adsDisconnectedToast);
  };

  if (!status) return null;

  const currency = insights?.currency ?? "";
  const money = (value: number, decimals = 0) =>
    `${currency} ${n(value.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }))}`.trim();
  const plain = (value: number, decimals = 0) =>
    n(value.toLocaleString("en-US", { maximumFractionDigits: decimals }));

  const totals = insights?.totals;
  const costPerPurchase = totals && totals.purchases > 0 ? totals.spend / totals.purchases : 0;
  // Tracked sales are in the store's currency and spend in the ad account's —
  // dividing one by the other is only meaningful when they match.
  const sameCurrency = Boolean(insights && storeCurrency && insights.currency === storeCurrency);
  const blendedRoas = totals && sameCurrency && totals.spend > 0 ? trackedRevenue / totals.spend : 0;

  const connectForm = (
    <div className="space-y-3 max-w-xl">
      <div>
        <label className="text-xs font-semibold text-foreground" htmlFor="ads-account-id">
          {t.admin.adsAccountIdLabel}
        </label>
        <input
          id="ads-account-id"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder={t.admin.adsAccountIdPlaceholder}
          inputMode="numeric"
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground" htmlFor="ads-token">
          {t.admin.adsTokenLabel}
        </label>
        <input
          id="ads-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={t.admin.adsTokenPlaceholder}
          autoComplete="off"
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t.admin.adsHowTo}</p>
      {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting || !accountId.trim() || !token.trim()}
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        <Plug className="w-4 h-4" />
        {connecting ? t.admin.adsConnecting : t.admin.adsConnectBtn}
      </button>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-foreground">{t.admin.adsTitle}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.admin.adsSubtitle}</p>
        </div>
        {status.connected && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-600 border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            <Unplug className="w-3.5 h-3.5" />
            {t.admin.adsDisconnect}
          </button>
        )}
      </div>

      {!status.connected && (
        <div>
          <p className="text-sm font-semibold text-foreground">{t.admin.adsConnectTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4 leading-relaxed">{t.admin.adsConnectDesc}</p>
          {connectForm}
        </div>
      )}

      {status.connected && needsReconnect && (
        <div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">{t.admin.adsReconnectHint}</p>
          {connectForm}
        </div>
      )}

      {status.connected && !needsReconnect && loadError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {t.admin.adsLoadFailed}: {loadError}
        </p>
      )}

      {status.connected && loading && !insights && (
        <div className="h-24 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {insights && totals && (
        <>
          <p className="text-[11px] text-muted-foreground">
            {t.admin.adsConnectedTo} <span className="font-semibold text-foreground">{insights.accountName}</span>
            {" · "}
            {t.admin.adsAmountsIn} {insights.currency}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Kpi label={t.admin.adsSpend} value={money(totals.spend)} />
            <Kpi label={t.admin.adsReach} value={plain(totals.reach)} />
            <Kpi label={t.admin.adsImpressions} value={plain(totals.impressions)} />
            <Kpi label={t.admin.adsClicks} value={plain(totals.linkClicks)} />
            <Kpi label={t.admin.adsCtr} value={`${plain(totals.ctr, 2)}%`} />
            <Kpi label={t.admin.adsCpc} value={money(totals.cpc, 2)} />
            <Kpi label={t.admin.adsCpm} value={money(totals.cpm, 2)} />
            <Kpi label={t.admin.adsFrequency} value={plain(totals.frequency, 2)} />
            <Kpi label={t.admin.adsPurchases} value={plain(totals.purchases)} />
            <Kpi label={t.admin.adsCostPerPurchase} value={costPerPurchase > 0 ? money(costPerPurchase) : "—"} />
            <Kpi label={t.admin.adsRoasMeta} value={totals.metaRoas > 0 ? plain(totals.metaRoas, 2) : "—"} />
            <Kpi
              label={t.admin.adsBlendedRoas}
              value={blendedRoas > 0 ? plain(blendedRoas, 2) : "—"}
              hint={t.admin.adsBlendedRoasDesc}
            />
          </div>

          {insights.daily.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">{t.admin.adsDailyTitle}</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={insights.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                    contentStyle={{ background: "var(--card, #fff)", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="spend" name={t.admin.adsSpend} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="purchaseValue" name={t.admin.adsPurchaseValue} stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t.admin.adsNoData}</p>
          )}

          {insights.campaigns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">{t.admin.adsCampaignsTitle}</p>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs min-w-140">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-semibold text-muted-foreground pb-2 pr-4">{t.admin.adsCampaignCol}</th>
                      <th className="text-right font-semibold text-muted-foreground pb-2 px-2">{t.admin.adsSpendCol}</th>
                      <th className="text-right font-semibold text-muted-foreground pb-2 px-2">{t.admin.adsReachCol}</th>
                      <th className="text-right font-semibold text-muted-foreground pb-2 px-2">{t.admin.adsClicksCol}</th>
                      <th className="text-right font-semibold text-muted-foreground pb-2 px-2">{t.admin.adsPurchasesCol}</th>
                      <th className="text-right font-semibold text-muted-foreground pb-2 pl-2">{t.admin.adsRoasCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {insights.campaigns.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 pr-4 font-medium text-foreground max-w-56 truncate">{c.name}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-foreground">{money(c.spend)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-foreground">{plain(c.reach)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-foreground">{plain(c.clicks)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-foreground">{plain(c.purchases)}</td>
                        <td className="py-2.5 pl-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {c.roas > 0 ? plain(c.roas, 2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
