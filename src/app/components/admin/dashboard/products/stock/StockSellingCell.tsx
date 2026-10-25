"use client";

import React from "react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { formatDate } from "@/lib/utils/formatDate";
import type { StockHealth } from "@/lib/queries/stock/stockInsightTypes";
import { StockHealthBadge } from "./StockHealthBadge";

/** The figures both a product roll-up and a single variant can give. */
export interface SellingInfo {
  sold30: number;
  daysLeft: number | null;
  lastSoldDate: string | null;
  lastAddedDate: string | null;
  health: StockHealth;
}

interface StockSellingCellProps {
  info: SellingInfo | null;
  /** Smaller text and no dates, for the phone cards. */
  compact?: boolean;
}

/**
 * One line saying how fast an item sells and how long its stock lasts, with
 * its health badge and (on desktop) when it last sold and last got stock.
 */
export function StockSellingCell({ info, compact = false }: StockSellingCellProps) {
  const t = useTranslation();
  const n = useLocalNum();

  if (!info) return <span className="text-xs text-muted-foreground">—</span>;

  const speed =
    info.sold30 > 0 ? t.admin.shSoldDays.replace("{n}", n(info.sold30)) : t.admin.shNoSales30;
  const left =
    info.sold30 > 0 && info.daysLeft !== null && info.daysLeft > 0
      ? t.admin.shDaysLeftAbout.replace("{n}", n(info.daysLeft))
      : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {info.health !== "healthy" && <StockHealthBadge health={info.health} />}
        <span className={`${compact ? "text-[11px]" : "text-xs"} font-medium text-foreground`}>{speed}</span>
      </div>
      {left && <span className="text-[11px] text-muted-foreground">{left}</span>}
      {!compact && (
        <span className="text-[11px] text-muted-foreground">
          {t.admin.shLastSold}: {info.lastSoldDate ? formatDate(info.lastSoldDate) : t.admin.shNever}
          {" · "}
          {t.admin.shStockAdded}: {info.lastAddedDate ? formatDate(info.lastAddedDate) : t.admin.shNever}
        </span>
      )}
    </div>
  );
}
