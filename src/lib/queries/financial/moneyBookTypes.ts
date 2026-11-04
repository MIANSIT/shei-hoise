export const MONEY_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"] as const;
export type MoneyMethod = (typeof MONEY_METHODS)[number];

/** A line of the opening balance: money on a payment method, or what was already owned or owed. */
export type OpeningLine = MoneyMethod | "fixed_assets" | "loans";

export type MoneyInType = "owner_investment" | "loan_received" | "other_income";
export type MoneyOutType = "loan_repayment" | "equipment_purchase";
/** The two types the daily cash count writes when the drawer does not match the books. */
export type CashCountType = "cash_over" | "cash_short";
export type MoneyEntryType = MoneyInType | MoneyOutType | CashCountType;

export interface MoneyEntry {
  id: string;
  kind: "in" | "out";
  entryType: MoneyEntryType;
  amount: number;
  paymentMethod: MoneyMethod;
  /** YYYY-MM-DD */
  date: string;
  note: string | null;
  branchId: string | null;
  /** The owner or investor behind it (owner money, loans); null for a bank or other lender. */
  partnerId: string | null;
}

export interface OpeningBalanceRow {
  line: OpeningLine;
  amount: number;
  /** YYYY-MM-DD */
  asOfDate: string;
  branchId: string | null;
}

export interface MoneyEntryInput {
  kind: "in" | "out";
  entryType: MoneyInType | MoneyOutType;
  amount: number;
  paymentMethod: MoneyMethod;
  date: string;
  note?: string;
  /** Stores with branches: the branch the money moved in. */
  branchId?: string | null;
  /** Owner money, a loan received or a loan repaid: who it was from or to. Optional. */
  partnerId?: string | null;
  /** Loan repayment only: how much of `amount` is interest. It is saved as an expense; the rest lowers the loan. */
  interestAmount?: number;
}

export interface OpeningBalancesInput {
  /** YYYY-MM-DD: the day these amounts were true. */
  asOfDate: string;
  branchId?: string | null;
  /** Lines left out (or blank) are saved as zero. */
  amounts: Partial<Record<OpeningLine, number>>;
}

export interface CashCountInput {
  date: string;
  branchId?: string | null;
  /** Cash actually in the drawer. */
  counted: number;
  /** What the books said the drawer should hold. */
  expected: number;
  note?: string;
}

export interface MoneyBookResult {
  success: boolean;
  error?: string;
}

/** The business's money on one payment method, as of today. */
export interface CashMethodPosition {
  method: MoneyMethod;
  /** The opening balance. */
  opening: number;
  /** What moved since the start date (sales, spending, withdrawals, money in and out). */
  moved: number;
  /** opening + moved. */
  left: number;
}

/** Cash & bank, equipment and loans as of today; the extra lines the Balance tab needs. */
export interface CashPosition {
  methods: CashMethodPosition[];
  /** Cash & bank, all methods together. */
  total: number;
  fixedAssets: number;
  loans: number;
}

/** Income that is not a sale (Money Book other income, cash over, minus cash short) for a period. */
export interface OtherIncomeResult {
  /** Net total for the period; negative when cash counted short outweighs the income. */
  total: number;
  /** Net per day, YYYY-MM-DD. */
  byDay: Record<string, number>;
}
