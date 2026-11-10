import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { getMoneyOverview, type MoneyMethodKey } from "./getMoneyOverview";
import { computeInvestorPositions } from "./investorMath";
import {
  START_METHODS,
  type InvestorDeal,
  type InvestorEntry,
  type InvestorEntryType,
  type InvestorKind,
  type InvestorSpend,
  type PayFrom,
  type StartMethod,
  type StartingCashRow,
} from "./investorMoneyTypes";
import type { CashMethodPosition, CashPosition } from "./moneyBookTypes";
import type { MoneyPartner } from "./moneyPartnerTypes";

interface StartDbRow {
  method: string;
  amount: number;
  as_of_date: string;
  branch_id: string | null;
}

/** The store's today (Asia/Dhaka) as YYYY-MM-DD, the day Money Overview counts in. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** The day after a YYYY-MM-DD date. */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Which of the three balances a Money Overview line belongs to. Card and online money sit in the bank; money with
 * no method recorded is counted as cash. COD cash stays with the courier until it is settled, so it has no balance yet.
 */
function balanceFor(method: MoneyMethodKey): StartMethod | null {
  if (method === "cash" || method === "other") return "cash";
  if (method === "mobile_banking") return "mobile_banking";
  if (method === "bank_transfer" || method === "card" || method === "online") return "bank_transfer";
  return null;
}

/**
 * The starting cash the owner entered. Owner only: the database lets nobody else read it.
 * @returns every branch's rows, or an empty list when none are saved or they cannot be read
 */
export async function getStartingCash(storeId: string): Promise<StartingCashRow[]> {
  const { data, error } = await supabase.from("money_start").select("method, amount, as_of_date, branch_id").eq("store_id", storeId);
  if (error) {
    console.error("Failed to load the starting cash:", error.message);
    return [];
  }
  return ((data ?? []) as StartDbRow[]).map((r) => ({
    method: r.method as StartMethod,
    amount: Number(r.amount),
    asOfDate: r.as_of_date,
    branchId: r.branch_id,
  }));
}

/**
 * The Investor account and the loans still owed, from the day the system started to a day. Owner only.
 * @returns both amounts, or zeros when nothing is recorded or it cannot be read
 */
async function getInvestorTotals(storeId: string, today: string): Promise<{ account: number; loansOwed: number }> {
  try {
    const [{ data: partnerRows }, { data: dealRows }] = await Promise.all([
      supabase.from("money_partners").select("id, name, kind").eq("store_id", storeId),
      supabase.from("investor_deals").select("id, partner_id, kind, profit_share_pct, note").eq("store_id", storeId),
    ]);
    const partners = (partnerRows ?? []) as MoneyPartner[];
    const deals: InvestorDeal[] = (
      (dealRows ?? []) as { id: string; partner_id: string; kind: string; profit_share_pct: number | null; note: string | null }[]
    ).map((d) => ({
      id: d.id,
      partnerId: d.partner_id,
      kind: d.kind as InvestorKind,
      profitSharePct: d.profit_share_pct === null ? null : Number(d.profit_share_pct),
      note: d.note,
    }));
    if (deals.length === 0) return { account: 0, loansOwed: 0 };

    const entryRows = await fetchAllPaged<{
      id: string;
      deal_id: string;
      entry_type: string;
      amount: number;
      entry_date: string;
      pay_from: string | null;
      payment_method: string | null;
      branch_id: string | null;
      period_month: string | null;
      note: string | null;
    }>((from, to) =>
      supabase
        .from("investor_entries")
        .select("id, deal_id, entry_type, amount, entry_date, pay_from, payment_method, branch_id, period_month, note")
        .eq("store_id", storeId)
        .lte("entry_date", today)
        .order("id")
        .range(from, to),
    );
    const entries: InvestorEntry[] = entryRows.map((e) => ({
      id: e.id,
      dealId: e.deal_id,
      type: e.entry_type as InvestorEntryType,
      amount: Number(e.amount),
      date: e.entry_date,
      payFrom: (e.pay_from as PayFrom | null) ?? null,
      method: (e.payment_method as StartMethod | null) ?? null,
      branchId: e.branch_id,
      periodMonth: e.period_month,
      note: e.note,
    }));

    const spends: InvestorSpend[] = [];
    const expenseRows = await fetchAllPaged<{ amount: number; expense_date: string; funder_id: string }>((from, to) =>
      supabase
        .from("expenses")
        .select("amount, expense_date, funder_id")
        .eq("store_id", storeId)
        .eq("paid_from", "outside")
        .not("funder_id", "is", null)
        .lte("expense_date", today)
        .order("id")
        .range(from, to),
    );
    for (const r of expenseRows) spends.push({ partnerId: r.funder_id, amount: Number(r.amount), date: r.expense_date });
    const ledgerRows = await fetchAllPaged<{ amount: number; entry_date: string; funder_id: string }>((from, to) =>
      supabase
        .from("supplier_ledger")
        .select("amount, entry_date, funder_id")
        .eq("store_id", storeId)
        .eq("kind", "payment")
        .eq("paid_from", "outside")
        .not("funder_id", "is", null)
        .lte("entry_date", today)
        .order("id")
        .range(from, to),
    );
    for (const r of ledgerRows) spends.push({ partnerId: r.funder_id, amount: Number(r.amount), date: r.entry_date });

    const positions = computeInvestorPositions(partners, deals, entries, spends);
    return { account: positions.accountTotal, loansOwed: positions.loansOwed };
  } catch (error) {
    console.error("Investor totals could not be read:", error);
    return { account: 0, loansOwed: 0 };
  }
}

/**
 * Business cash today, and the Investor account.
 *
 * Business cash on each method = the starting cash + what Money Overview works out AFTER the start date
 * (sales and dues collected, vendor payments, minus expenses, supplier payments, refunds, withdrawals, plus or
 * minus transfers; payments from the Investor account are not part of it) - investor repayments and profit
 * shares paid from business cash. The starting cash is what was held at the end of the start date, so a count
 * taken today with today's date does not count today's sales twice. Each branch counts from its own start date;
 * "all branches" adds them up.
 *
 * The Investor account and the loans still owed belong to the whole store, so they show only when no branch is
 * picked.
 * @param asOfDate YYYY-MM-DD: work it out as of the end of that day instead of today (a starting cash saved after
 *   that day does not apply, so a day before the starting cash has no position)
 * @returns the position, or null when no starting cash is saved for this scope
 */
export async function getCashPosition(
  storeId: string,
  branchId: string | null,
  withBranches: boolean,
  asOfDate?: string | null,
): Promise<CashPosition | null> {
  const starts = (await getStartingCash(storeId))
    .filter((o) => (branchId ? o.branchId === branchId : true))
    .filter((o) => !asOfDate || o.asOfDate <= asOfDate);
  if (starts.length === 0) return null;

  const today = asOfDate ?? dhakaToday();
  const earliest = starts.reduce((min, o) => (o.asOfDate < min ? o.asOfDate : min), starts[0].asOfDate);

  // Investor repayments and profit shares paid from business cash take money from one branch's balance.
  const { data: paidRows } = await supabase
    .from("investor_entries")
    .select("amount, entry_date, payment_method, branch_id")
    .eq("store_id", storeId)
    .eq("pay_from", "business")
    .gte("entry_date", earliest)
    .lte("entry_date", today);
  const paid = ((paidRows ?? []) as { amount: number; entry_date: string; payment_method: string | null; branch_id: string | null }[]).map((r) => ({
    amount: Number(r.amount),
    date: r.entry_date,
    method: (r.payment_method ?? "cash") as StartMethod,
    branchId: r.branch_id,
  }));

  const branchKeys = [...new Set(starts.map((o) => o.branchId))];
  const left = new Map<StartMethod, { opening: number; moved: number }>(START_METHODS.map((m) => [m, { opening: 0, moved: 0 }]));

  for (const key of branchKeys) {
    const rows = starts.filter((o) => o.branchId === key);
    const asOf = rows.reduce((min, o) => (o.asOfDate < min ? o.asOfDate : min), rows[0].asOfDate);
    // The starting cash is the end of the start date, so movements count from the day after.
    const from = nextDay(asOf);
    const overview = from <= today ? await getMoneyOverview(storeId, from, today, key, withBranches, true) : null;

    for (const row of rows) left.get(row.method)!.opening += row.amount;
    for (const row of overview?.byMethod ?? []) {
      const balance = balanceFor(row.method);
      if (balance) left.get(balance)!.moved += row.left;
    }
    for (const p of paid) {
      // A store-wide starting cash (no branch) counts every payment made from business cash; a branch's own
      // starting cash counts only the payments that branch made.
      if ((key === null || p.branchId === key) && p.date > asOf) left.get(p.method)!.moved -= p.amount;
    }
  }

  // Money sent between branches and not confirmed yet has left the sender and is in no branch, but it is still the
  // business's money: the whole-store total counts it.
  // Only for branches that count their own cash: a store-wide count never takes a transfer out in the first place.
  const countedBranches = new Set(branchKeys.filter((k): k is string => k !== null));
  if (!branchId && withBranches && countedBranches.size > 0) {
    const { data: transit } = await supabase
      .from("branch_money_transfers")
      .select("amount, payment_method, from_branch_id")
      .eq("store_id", storeId)
      .eq("status", "sent")
      .lte("transfer_date", today);
    for (const r of (transit ?? []) as { amount: number; payment_method: string; from_branch_id: string }[]) {
      const balance = left.get(r.payment_method as StartMethod);
      if (balance && countedBranches.has(r.from_branch_id)) balance.moved += Number(r.amount);
    }
  }

  const methods: CashMethodPosition[] = START_METHODS.map((method) => {
    const { opening, moved } = left.get(method)!;
    return { method, opening, moved, left: opening + moved };
  }).filter((m) => Math.abs(m.opening) > 0.005 || Math.abs(m.moved) > 0.005);

  let investorAccount = 0;
  let loans = 0;
  if (!branchId) {
    const totals = await getInvestorTotals(storeId, today);
    investorAccount = totals.account;
    loans = totals.loansOwed;
  }

  return {
    methods,
    total: methods.reduce((sum, m) => sum + m.left, 0),
    fixedAssets: 0,
    loans,
    investorAccount,
  };
}
