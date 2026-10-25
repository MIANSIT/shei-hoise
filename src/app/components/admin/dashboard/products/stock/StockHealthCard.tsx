"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { StockHealth, StockInsights } from "@/lib/queries/stock/stockInsightTypes";
import { HEALTH_TONE, useHealthLabel } from "./StockHealthBadge";

interface StockHealthCardProps {
  summary: StockInsights["summary"];
  formatMoney: (amount: number) => React.ReactNode;
  /** Which health the list below is filtered to, if any. */
  activeHealth?: StockHealth | null;
  /** Tapping a tile filters the list to that health (tap again to clear). */
  onSelect?: (health: StockHealth) => void;
}

/** The states shown as tiles, most urgent first. "New" is too early to judge, so it only counts toward the bar. */
const TILES: readonly StockHealth[] = ["restock", "dead", "slow", "healthy"];

/**
 * A short answer to "is my stock selling?": how many items need restocking,
 * have stopped selling or are selling slowly, and how much money the idle
 * ones tie up. Each tile filters the stock list below it.
 */
export function StockHealthCard({ summary, formatMoney, activeHealth = null, onSelect }: StockHealthCardProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const label = useHealthLabel();

  const total = (Object.values(summary) as { count: number }[]).reduce((sum, s) => sum + s.count, 0);
  const hintFor: Record<StockHealth, string> = {
    restock: t.admin.shRestockHint,
    slow: t.admin.shSlowHint,
    dead: t.admin.shDeadHint,
    healthy: t.admin.shHealthyHint,
    new: t.admin.shNewHint,
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground m-0">{t.admin.shCardTitle}</h2>
          <p className="text-xs text-muted-foreground m-0 mt-0.5">{t.admin.shCardSub}</p>
        </div>
        <Link
          href="/dashboard/stock/health"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {t.admin.shSeeDetails}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {total > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {(["restock", "dead", "slow", "new", "healthy"] as const).map((health) =>
            summary[health].count > 0 ? (
              <div
                key={health}
                className={HEALTH_TONE[health].bar}
                style={{ width: `${(summary[health].count / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TILES.map((health) => {
          const { count, value } = summary[health];
          const active = activeHealth === health;
          const showMoney = (health === "slow" || health === "dead") && value > 0;
          return (
            <button
              key={health}
              type="button"
              onClick={() => onSelect?.(health)}
              disabled={!onSelect}
              title={hintFor[health]}
              className={`text-left rounded-xl border p-3 transition-colors ${
                active ? "border-foreground/40 bg-muted" : "border-border hover:bg-muted/60"
              } disabled:cursor-default`}
            >
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${HEALTH_TONE[health].text}`}>
                {label(health)}
              </div>
              <div className="mt-1 text-xl font-black tabular-nums text-foreground">{n(count)}</div>
              <div className="text-[11px] text-muted-foreground">
                {showMoney ? (
                  <>
                    {formatMoney(value)} {t.admin.shTiedUp}
                  </>
                ) : (
                  t.admin.shProductsCount.replace("{n}", n(count))
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
