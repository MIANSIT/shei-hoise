import type { MoneyPartner } from "./moneyPartnerTypes";

/** What kind of money a person gave: a loan, an investment that shares profit, or an investment that is paid back. */
export type InvestorKind = "loan" | "profit_share" | "payback";

/**
 * What happened on a deal:
 *  - put_in: the person gave money (raises the Investor account)
 *  - repay: loan principal paid back
 *  - pay_back: investment paid back (lowers the investor's capital)
 *  - profit_share_paid: a profit share paid for one month
 */
export type InvestorEntryType = "put_in" | "previous_in" | "repay" | "pay_back" | "profit_share_paid" | "interest";

/** Which pocket paid: the money the business made, or the Investor account. */
export type PayFrom = "business" | "investor";

/** The payment methods that hold the business's money. */
export const START_METHODS = ["cash", "mobile_banking", "bank_transfer"] as const;
export type StartMethod = (typeof START_METHODS)[number];

/** From this month on (YYYY-MM), the profit share is this percent. */
export interface InvestorRate {
  fromMonth: string;
  pct: number;
}

export interface InvestorDeal {
  id: string;
  partnerId: string;
  kind: InvestorKind;
  /** Profit share only: the percent the deal started with. Later changes are in `rates`. */
  profitSharePct: number | null;
  /** Profit share only: changes of the percent, each from a month on. */
  rates?: readonly InvestorRate[];
  note: string | null;
}

export interface InvestorEntry {
  id: string;
  dealId: string;
  type: InvestorEntryType;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  /** Null for put_in. */
  payFrom: PayFrom | null;
  method: StartMethod | null;
  branchId: string | null;
  /** YYYY-MM, profit_share_paid only. */
  periodMonth: string | null;
  note: string | null;
}

/** Starting cash for one payment method, counted at the end of asOfDate. */
export interface StartingCashRow {
  method: StartMethod;
  amount: number;
  /** YYYY-MM-DD */
  asOfDate: string;
  branchId: string | null;
}

/** One deal with what was put in and what has gone back. */
export interface DealPosition {
  deal: InvestorDeal;
  putIn: number;
  /** Loan principal repaid, or investment paid back. */
  paidBack: number;
  /** Loan still owed, or investment capital still in the business. */
  left: number;
  /** Profit shares paid so far (profit_share deals). */
  sharePaid: number;
}

/** What the business holds for one person. */
export interface PartnerPosition {
  partner: MoneyPartner;
  deals: DealPosition[];
  putIn: number;
  /** What was taken from this person's money: payments from the Investor account, repayments and shares paid from it. */
  spentFromAccount: number;
  /** putIn - spentFromAccount: what is still in the Investor account for this person. */
  available: number;
  loanOwed: number;
  capitalNow: number;
}

export interface InvestorPositions {
  partners: PartnerPosition[];
  /** The Investor account: the money of all people still in it. */
  accountTotal: number;
  /** Loans the business still owes. */
  loansOwed: number;
  /** Investment capital still in the business. */
  capitalTotal: number;
}

/** A payment from the Investor account for an expense or supplier bill. */
export interface InvestorSpend {
  partnerId: string;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
}

export interface InvestorOverview {
  /** The day the new system started (the earliest starting-cash date), or null before it is set up. */
  goLive: string | null;
  start: StartingCashRow[];
  deals: InvestorDeal[];
  entries: InvestorEntry[];
  positions: InvestorPositions;
}

export interface InvestorResult {
  success: boolean;
  error?: string;
}

export interface AddInvestorMoneyInput {
  /** An existing person, or leave out and give newPersonName. */
  partnerId?: string | null;
  newPersonName?: string;
  newPersonKind?: MoneyPartner["kind"];
  kind: InvestorKind;
  /** Profit share only. */
  profitSharePct?: number | null;
  amount: number;
  date: string;
  note?: string;
  /** Money put in before the store used this page: it counts as owed to the person, but not in the Investor account. */
  previous?: boolean;
}

export interface PayInvestorBackInput {
  dealId: string;
  /** For a loan this is the whole payment, interest included. */
  amount: number;
  /** Loan only: how much of amount is interest. */
  interestAmount?: number;
  date: string;
  note?: string;
}

export interface ChangeSharePercentInput {
  dealId: string;
  /** The new percent. */
  pct: number;
  /** YYYY-MM: the first month the new percent applies to. */
  fromMonth: string;
}

export interface PayProfitShareInput {
  dealId: string;
  /** YYYY-MM */
  month: string;
  amount: number;
  date: string;
  note?: string;
}

export interface StartingCashInput {
  /** YYYY-MM-DD: the day these amounts were counted, at the end of that day. */
  asOfDate: string;
  branchId?: string | null;
  amounts: Partial<Record<StartMethod, number>>;
}

/** The people who can pay from the Investor account, with what each still has in it. */
export interface InvestorAvailable {
  partner: MoneyPartner;
  available: number;
}
