"use client";

import type { PixelAnalyticsData } from "@/lib/queries/pixelEvents/getPixelAnalytics";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface MetaInsightsSectionsProps {
  data: PixelAnalyticsData | null;
  loading: boolean;
  /** The funnel in order, e.g. PageView → … → Purchase, with display labels. */
  funnel: { key: string; label: string }[];
}

function Card({ title, subtitle, gradient, children }: { title: string; subtitle?: string; gradient: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-1 h-5 rounded-full bg-linear-to-b ${gradient}`} />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mb-4 max-w-2xl leading-relaxed">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

/** Details only known once the shopper fills in checkout — measured against checkout events. */
const CHECKOUT_ONLY_KEYS: ReadonlySet<string> = new Set(["ph", "em", "fn", "ln", "ct", "zp", "country"]);

// Coverage bars: ≥70% healthy, ≥30% middling, below that neutral — a detail
// the store never collects (e.g. email on a phone-only checkout) is just
// "not collected", not an alarm.
function coverageStyle(share: number): { bar: string; text: string } {
  if (share >= 0.7) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
  if (share >= 0.3) return { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" };
  return { bar: "bg-gray-400", text: "text-muted-foreground" };
}

function RankList({ rows, emptyText, valueLabel, n }: { rows: { name: string; value: number }[]; emptyText: string; valueLabel: string; n: (v: number | string) => string }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="flex items-center justify-between text-xs mb-1 gap-2">
            <span className="font-medium text-foreground truncate">{row.name}</span>
            <span className="tabular-nums text-muted-foreground shrink-0">
              {n(row.value)} {valueLabel}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-400" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MetaInsightsSections({ data, loading, funnel }: MetaInsightsSectionsProps) {
  const t = useTranslation();
  const n = useLocalNum();

  if (loading || !data) return null;

  const pct = (share: number) => `${n(Math.round(share * 100))}%`;

  // ── Biggest drop between two neighbouring funnel steps ──
  let worst: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < funnel.length; i++) {
    const prev = data.totals[funnel[i - 1].key] ?? 0;
    const cur = data.totals[funnel[i].key] ?? 0;
    if (prev <= 0) continue;
    const lost = Math.min(Math.max(1 - cur / prev, 0), 1);
    if (!worst || lost > worst.lost) worst = { from: funnel[i - 1].label, to: funnel[i].label, lost };
  }

  const matchRows: [string, string][] = [
    ["fbp", t.admin.pixelMatchFbp],
    ["fbc", t.admin.pixelMatchFbc],
    ["ph", t.admin.pixelMatchPhone],
    ["em", t.admin.pixelMatchEmail],
    ["fn", t.admin.pixelMatchFirstName],
    ["ln", t.admin.pixelMatchLastName],
    ["ct", t.admin.pixelMatchCity],
    ["zp", t.admin.pixelMatchPostCode],
    ["country", t.admin.pixelMatchCountry],
    ["external_id", t.admin.pixelMatchVisitorId],
    ["ip", t.admin.pixelMatchIp],
    ["ua", t.admin.pixelMatchDevice],
  ];

  return (
    <>
      {/* ── Customer details sent to Meta ── */}
      <Card title={t.admin.pixelMatchTitle} subtitle={t.admin.pixelMatchDesc} gradient="from-violet-400 to-purple-500">
        {data.matchQuality.total === 0 ? (
          <p className="text-xs text-muted-foreground">{t.admin.pixelMatchEmpty}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {matchRows.map(([key, label]) => {
                const share = data.matchQuality.coverage[key] ?? 0;
                const style = coverageStyle(share);
                // No checkout has happened yet, so there is nothing to measure against.
                const notMeasured = CHECKOUT_ONLY_KEYS.has(key) && data.matchQuality.checkoutTotal === 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className={`font-semibold tabular-nums ${notMeasured ? "text-muted-foreground" : style.text}`}>
                        {notMeasured ? "—" : pct(share)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${share * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              {n(data.matchQuality.total)} {t.admin.pixelMatchEventsCounted}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t.admin.pixelMatchCheckoutNote} {n(data.matchQuality.checkoutTotal)}
            </p>
          </>
        )}
      </Card>

      {/* ── Biggest drop-off ── */}
      {worst && worst.lost > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5">
          <p className="text-3xl font-black text-amber-700 dark:text-amber-400 tabular-nums">{pct(worst.lost)}</p>
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400">{t.admin.pixelDropOffTitle}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {worst.from} → {worst.to}
            </p>
            <p className="text-xs text-muted-foreground">{t.admin.pixelDropOffLeave}</p>
          </div>
        </div>
      )}

      {/* ── Search terms / categories / brands ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title={t.admin.pixelSearchTermsTitle} gradient="from-sky-400 to-blue-500">
          <RankList
            rows={data.searchTerms.map((s) => ({ name: s.name, value: s.count }))}
            emptyText={t.admin.pixelNoPeriodData}
            valueLabel={t.admin.pixelSearchesCol}
            n={n}
          />
        </Card>
        <Card title={t.admin.pixelCategoriesTitle} gradient="from-blue-400 to-indigo-500">
          <RankList
            rows={data.categories.map((c) => ({ name: c.name, value: c.count }))}
            emptyText={t.admin.pixelNoPeriodData}
            valueLabel={t.admin.pixelViewsCol}
            n={n}
          />
        </Card>
        <Card title={t.admin.pixelBrandsTitle} gradient="from-violet-400 to-purple-500">
          <RankList
            rows={data.brands.map((b) => ({ name: b.name, value: b.views }))}
            emptyText={t.admin.pixelNoPeriodData}
            valueLabel={t.admin.pixelViewsCol}
            n={n}
          />
        </Card>
      </div>

      {/* ── Every event ── */}
      <Card title={t.admin.pixelAllEventsTitle} subtitle={t.admin.pixelAllEventsSubtitle} gradient="from-blue-400 to-blue-600">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs min-w-120">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold text-muted-foreground pb-2 pr-4">{t.admin.pixelEventCol}</th>
                <th className="text-right font-semibold text-muted-foreground pb-2 px-2">{t.admin.pixelCountCol}</th>
                <th className="text-right font-semibold text-muted-foreground pb-2 px-2 whitespace-nowrap">{t.admin.pixelConfirmedCol}</th>
                <th className="text-right font-semibold text-muted-foreground pb-2 pl-2 whitespace-nowrap">{t.admin.pixelLastSeenCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.allEvents.map((e) => (
                <tr key={e.eventName}>
                  <td className="py-2.5 pr-4 font-medium text-foreground">{e.eventName}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-foreground">{n(e.count)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-foreground">
                    {n(e.capiDelivered)}
                    <span className="text-muted-foreground"> ({pct(e.count > 0 ? e.capiDelivered / e.count : 0)})</span>
                  </td>
                  <td className="py-2.5 pl-2 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {new Date(e.lastSeen).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
