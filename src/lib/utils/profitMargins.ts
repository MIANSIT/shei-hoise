/**
 * The one place profit percentages are worked out, so the dashboard card, the
 * KPI cards, the story card and the P&L report all show the same numbers.
 *
 * Profit on TP (markup): profit ÷ TP cost. TP 100, sold 125 = 25%. How the shop prices.
 * Margin on selling price: profit ÷ sales. TP 100, sold 125 = 20%. The accounting view.
 *
 * A line sold with no TP is not free. Its sales are taken out of both sides
 * (`missingCostSales`), so it can neither inflate the profit nor the percentage.
 */
export interface MarginInput {
  /** Net sales of the period (before vendor margin). */
  netRevenue: number;
  /** TP cost of the items sold; lines with no TP contribute 0 here. */
  cogs: number;
  grossProfit: number;
  /** What the lines with no TP sold for. 0 when unknown or none. */
  missingCostSales?: number;
}

export interface Margins {
  /** Gross profit ÷ TP cost, as a percentage; null when nothing with a TP was sold. */
  profitOnTp: number | null;
  /** Gross profit ÷ net sales, as a percentage; null when there were no sales with a TP. */
  grossMargin: number | null;
  /** Gross profit on the lines that have a TP. */
  knownGrossProfit: number;
}

export function computeMargins({ netRevenue, cogs, grossProfit, missingCostSales = 0 }: MarginInput): Margins {
  const knownRevenue = netRevenue - missingCostSales;
  const knownGrossProfit = grossProfit - missingCostSales;
  return {
    profitOnTp: cogs > 0 ? (knownGrossProfit / cogs) * 100 : null,
    grossMargin: knownRevenue > 0 ? (knownGrossProfit / knownRevenue) * 100 : null,
    knownGrossProfit,
  };
}

/**
 * Net margin: net profit ÷ everything earned. Net profit includes the margin
 * made on vendor sales, so that margin is part of what was earned too;
 * otherwise a shop with vendor sales shows a margin that is too high.
 */
export function netMarginPct(netProfit: number, netRevenue: number, vendorProfit = 0, missingCostSales = 0): number | null {
  const earned = netRevenue + vendorProfit - missingCostSales;
  return earned > 0 ? ((netProfit - missingCostSales) / earned) * 100 : null;
}
