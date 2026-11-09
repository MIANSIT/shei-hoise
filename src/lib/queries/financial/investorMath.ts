import type { MoneyPartner } from "./moneyPartnerTypes";
import type {
  DealPosition,
  InvestorDeal,
  InvestorEntry,
  InvestorPositions,
  InvestorSpend,
  PartnerPosition,
} from "./investorMoneyTypes";

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Works out what each person has in the business from their deals and entries.
 * Pure: the caller passes only records dated on or after the day the system started.
 *
 *  - putIn: every put_in on their deals. An earlier investment (previous_in) is left out: it is already in the
 *    business's cash and stock, so it counts only in loanOwed and capitalNow
 *  - spentFromAccount: payments they funded from the Investor account (expenses, supplier bills) plus every
 *    repayment, payback, interest payment and profit share. It can pass putIn, so available can go below zero
 *  - available: putIn - spentFromAccount, what is still in the Investor account for them
 *  - loanOwed: loan put in minus loan principal repaid
 *  - capitalNow: investment put in minus investment paid back
 */
export function computeInvestorPositions(
  partners: MoneyPartner[],
  deals: InvestorDeal[],
  entries: InvestorEntry[],
  outsideSpends: InvestorSpend[],
): InvestorPositions {
  const positions: PartnerPosition[] = [];

  for (const partner of partners) {
    const own = deals.filter((d) => d.partnerId === partner.id);
    let putIn = 0;
    let spent = 0;
    let loanOwed = 0;
    let capitalNow = 0;
    const dealPositions: DealPosition[] = own.map((deal) => {
      const mine = entries.filter((e) => e.dealId === deal.id);
      const cashIn = mine.filter((e) => e.type === "put_in").reduce((s, e) => s + e.amount, 0);
      const dealPutIn = cashIn + mine.filter((e) => e.type === "previous_in").reduce((s, e) => s + e.amount, 0);
      const paidBack = mine.filter((e) => e.type === "repay" || e.type === "pay_back").reduce((s, e) => s + e.amount, 0);
      const sharePaid = mine.filter((e) => e.type === "profit_share_paid").reduce((s, e) => s + e.amount, 0);
      spent += mine.filter((e) => e.type !== "put_in" && e.type !== "previous_in").reduce((s, e) => s + e.amount, 0);
      putIn += cashIn;
      const left = Math.max(round2(dealPutIn - paidBack), 0);
      if (deal.kind === "loan") loanOwed += left;
      else capitalNow += left;
      return { deal, putIn: round2(dealPutIn), paidBack: round2(paidBack), left, sharePaid: round2(sharePaid) };
    });
    spent += outsideSpends.filter((s) => s.partnerId === partner.id).reduce((sum, s) => sum + s.amount, 0);
    positions.push({
      partner,
      deals: dealPositions,
      putIn: round2(putIn),
      spentFromAccount: round2(spent),
      available: round2(putIn - spent),
      loanOwed: round2(loanOwed),
      capitalNow: round2(capitalNow),
    });
  }

  return {
    partners: positions,
    accountTotal: round2(positions.reduce((s, p) => s + p.available, 0)),
    loansOwed: round2(positions.reduce((s, p) => s + p.loanOwed, 0)),
    capitalTotal: round2(positions.reduce((s, p) => s + p.capitalNow, 0)),
  };
}

/**
 * The profit share percent that applies to a month: the latest change at or before that month, or the percent the
 * deal started with.
 */
export function ratePctFor(deal: InvestorDeal, month: string): number {
  let pct = deal.profitSharePct ?? 0;
  const rates = [...(deal.rates ?? [])].sort((a, b) => (a.fromMonth < b.fromMonth ? -1 : a.fromMonth > b.fromMonth ? 1 : 0));
  for (const r of rates) if (r.fromMonth <= month) pct = r.pct;
  return pct;
}

/**
 * The first month a profit-share deal can earn (YYYY-MM). An earlier investment counts from the month the system
 * started, because months before it are not tracked here.
 */
export function firstShareMonth(entries: InvestorEntry[], dealId: string, goLive: string | null): string | null {
  const start = goLive?.slice(0, 7) ?? "";
  const months = entries
    .filter((e) => e.dealId === dealId && (e.type === "put_in" || e.type === "previous_in"))
    .map((e) => {
      const month = e.date.slice(0, 7);
      return e.type === "previous_in" && month < start ? start : month;
    })
    .sort();
  return months[0] ?? null;
}

/** The percent a profit-share deal has now. */
export function currentPct(deal: InvestorDeal): number {
  return ratePctFor(deal, "9999-12");
}

/**
 * The profit share due for one month: the deal's percent of that month's profit.
 * A loss gives zero, and months before the deal's first put-in give zero.
 * @param monthProfit net profit of the month, as the Sales tab shows it
 * @param firstPutInMonth YYYY-MM of the deal's first put-in
 */
export function profitShareDue(pct: number, monthProfit: number, month: string, firstPutInMonth: string | null): number {
  if (!firstPutInMonth || month < firstPutInMonth) return 0;
  return round2(Math.max(monthProfit, 0) * (pct / 100));
}
