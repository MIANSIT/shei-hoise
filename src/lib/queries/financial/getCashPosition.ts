import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { getMoneyOverview } from "./getMoneyOverview";
import {
  MONEY_METHODS,
  type CashMethodPosition,
  type CashPosition,
  type MoneyEntry,
  type MoneyEntryType,
  type MoneyMethod,
  type OpeningBalanceRow,
  type OpeningLine,
} from "./moneyBookTypes";
import type { FunderTreatment, MoneyPartner, PartnerSummary } from "./moneyPartnerTypes";

interface OpeningDbRow {
  line: string;
  amount: number;
  as_of_date: string;
  branch_id: string | null;
}

interface EntryDbRow {
  id: string;
  kind: string;
  entry_type: string;
  amount: number;
  payment_method: string;
  entry_date: string;
  note: string | null;
  branch_id: string | null;
  partner_id?: string | null;
}

/** The store's today (Asia/Dhaka) as YYYY-MM-DD, the day Money Overview counts in. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Card is part of Bank: one balance, so anything saved as card is counted with bank. */
function foldCard<T extends string>(method: T): T | "bank_transfer" {
  return method === "card" ? "bank_transfer" : method;
}

/** The day after a YYYY-MM-DD date. */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The starting balances the owner entered. Owner only: the database lets
 * nobody else read them.
 * @returns every branch's rows, or an empty list when none are saved or they cannot be read
 */
export async function getOpeningBalances(storeId: string): Promise<OpeningBalanceRow[]> {
  const { data, error } = await supabase
    .from("money_opening_balances")
    .select("line, amount, as_of_date, branch_id")
    .eq("store_id", storeId);
  if (error) {
    console.error("Failed to load opening balances:", error.message);
    return [];
  }
  return ((data ?? []) as OpeningDbRow[]).map((r) => ({
    line: r.line as OpeningLine,
    amount: Number(r.amount),
    asOfDate: r.as_of_date,
    branchId: r.branch_id,
  }));
}

/**
 * Money in and out entered on the Money Book, newest first. Owner only.
 * @returns the entries from `fromDate` on (all of them when omitted), or an empty list on failure
 */
export async function getMoneyEntries(storeId: string, fromDate?: string): Promise<MoneyEntry[]> {
  try {
    const load = (columns: string) =>
      fetchAllPaged<EntryDbRow>((from, to) => {
        let query = supabase.from("money_entries").select(columns).eq("store_id", storeId);
        if (fromDate) query = query.gte("entry_date", fromDate);
        return query.order("id").range(from, to) as unknown as PromiseLike<{
          data: EntryDbRow[] | null;
          error: { message: string } | null;
        }>;
      });
    let rows: EntryDbRow[];
    try {
      rows = await load("id, kind, entry_type, amount, payment_method, entry_date, note, branch_id, partner_id");
    } catch {
      // The owners-and-investors migration is not in the database yet: entries simply have no person.
      rows = await load("id, kind, entry_type, amount, payment_method, entry_date, note, branch_id");
    }
    return rows
      .map((r) => ({
        id: r.id,
        kind: (r.kind === "out" ? "out" : "in") as "in" | "out",
        entryType: r.entry_type as MoneyEntryType,
        amount: Number(r.amount),
        paymentMethod: r.payment_method as MoneyMethod,
        date: r.entry_date,
        note: r.note,
        branchId: r.branch_id,
        partnerId: r.partner_id ?? null,
      }))
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  } catch (error) {
    console.error("Failed to load money entries:", error);
    return [];
  }
}

/**
 * Cash & bank, equipment and loans as of today.
 *
 * Money on each method = the opening balance + what Money Overview works out
 * AFTER the start date (sales and dues collected, vendor payments, minus
 * expenses, supplier payments, refunds, withdrawals, plus or minus transfers)
 * + money in − money out entered on the Money Book after that date. The
 * opening balance is what was held at the end of the start date, so a count
 * taken today with today's date does not count today's sales twice. Each branch
 * counts from its own start date; "all branches" adds them up. Equipment and
 * loans are the opening amounts plus what was bought or borrowed since, less
 * what was repaid.
 * @param asOfDate YYYY-MM-DD: work it out as of the end of that day instead of today (an opening balance
 *   saved after that day does not apply, so a day before the first opening balance has no position)
 * @returns the position, or null when no opening balance is saved for this scope
 */
export async function getCashPosition(
  storeId: string,
  branchId: string | null,
  withBranches: boolean,
  asOfDate?: string | null,
): Promise<CashPosition | null> {
  const openings = (await getOpeningBalances(storeId))
    .filter((o) => (branchId ? o.branchId === branchId : true))
    .filter((o) => !asOfDate || o.asOfDate <= asOfDate);
  if (openings.length === 0) return null;

  const today = asOfDate ?? dhakaToday();
  const earliest = openings.reduce((min, o) => (o.asOfDate < min ? o.asOfDate : min), openings[0].asOfDate);
  const entries = (await getMoneyEntries(storeId, earliest)).filter((e) => e.date <= today);

  // Costs and supplier payments an owner or investor paid, counted as a loan the business owes them.
  const outsideLoans = (await getOutsidePayments(storeId, earliest)).filter((p) => p.treatment === "loan" && p.date <= today);

  const branchKeys = [...new Set(openings.map((o) => o.branchId))];
  const left = new Map<MoneyMethod, { opening: number; moved: number }>(MONEY_METHODS.map((m) => [m, { opening: 0, moved: 0 }]));
  let fixedAssets = 0;
  let loans = 0;

  for (const key of branchKeys) {
    const rows = openings.filter((o) => o.branchId === key);
    const asOf = rows.reduce((min, o) => (o.asOfDate < min ? o.asOfDate : min), rows[0].asOfDate);
    // The opening balance is the end of the start date, so movements count from the day after.
    const from = nextDay(asOf);
    const overview = from <= today ? await getMoneyOverview(storeId, from, today, key, withBranches, true) : null;

    for (const row of rows) {
      if (row.line === "fixed_assets") fixedAssets += row.amount;
      else if (row.line === "loans") loans += row.amount;
      else left.get(foldCard(row.line))!.opening += row.amount;
    }
    for (const method of MONEY_METHODS) {
      left.get(method)!.moved += overview?.byMethod.find((r) => r.method === method)?.left ?? 0;
    }
    for (const entry of entries) {
      if (entry.branchId !== key || entry.date <= asOf) continue;
      const signed = entry.kind === "in" ? entry.amount : -entry.amount;
      left.get(foldCard(entry.paymentMethod))!.moved += signed;
      if (entry.entryType === "equipment_purchase") fixedAssets += entry.amount;
      if (entry.entryType === "loan_received") loans += entry.amount;
      if (entry.entryType === "loan_repayment") loans -= entry.amount;
    }
  }

  // Whole store: every such payment since the earliest start date. One branch: that branch's expenses
  // (supplier payments from outside are not tied to a branch, so they are left out of a branch view).
  for (const p of outsideLoans) {
    if (branchId ? p.source === "expense" && p.branchId === branchId : true) loans += p.amount;
  }

  const methods: CashMethodPosition[] = MONEY_METHODS.map((method) => {
    const { opening, moved } = left.get(method)!;
    return { method, opening, moved, left: opening + moved };
  }).filter((m) => Math.abs(m.opening) > 0.005 || Math.abs(m.moved) > 0.005);

  return {
    methods,
    total: methods.reduce((sum, m) => sum + m.left, 0),
    fixedAssets,
    loans: Math.max(loans, 0),
  };
}


/** A cost or supplier payment an owner or investor paid, from outside the shop's money. */
interface OutsidePayment {
  source: "expense" | "supplier";
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  branchId: string | null;
  partnerId: string;
  treatment: FunderTreatment;
}

/**
 * Expenses and supplier payments marked as paid from outside the shop with a
 * person and a treatment. Owner only. Empty when none exist or the
 * owners-and-investors migration is not in the database yet.
 * @returns those payments dated on or after `fromDate`
 */
async function getOutsidePayments(storeId: string, fromDate?: string): Promise<OutsidePayment[]> {
  try {
    const out: OutsidePayment[] = [];
    let expenses = supabase
      .from("expenses")
      .select("amount, expense_date, branch_id, funder_id, funder_treatment")
      .eq("store_id", storeId)
      .eq("paid_from", "outside")
      .not("funder_id", "is", null);
    if (fromDate) expenses = expenses.gt("expense_date", fromDate);
    const expenseRes = await expenses;
    if (expenseRes.error) throw new Error(expenseRes.error.message);
    for (const r of (expenseRes.data ?? []) as { amount: number; expense_date: string; branch_id: string | null; funder_id: string; funder_treatment: FunderTreatment | null }[]) {
      if (!r.funder_treatment) continue;
      out.push({ source: "expense", amount: Number(r.amount), date: r.expense_date, branchId: r.branch_id, partnerId: r.funder_id, treatment: r.funder_treatment });
    }

    let ledger = supabase
      .from("supplier_ledger")
      .select("amount, entry_date, branch_id, funder_id, funder_treatment")
      .eq("store_id", storeId)
      .eq("kind", "payment")
      .eq("paid_from", "outside")
      .not("funder_id", "is", null);
    if (fromDate) ledger = ledger.gt("entry_date", fromDate);
    const ledgerRes = await ledger;
    if (ledgerRes.error) throw new Error(ledgerRes.error.message);
    for (const r of (ledgerRes.data ?? []) as { amount: number; entry_date: string; branch_id: string | null; funder_id: string; funder_treatment: FunderTreatment | null }[]) {
      if (!r.funder_treatment) continue;
      out.push({ source: "supplier", amount: Number(r.amount), date: r.entry_date, branchId: r.branch_id, partnerId: r.funder_id, treatment: r.funder_treatment });
    }
    return out;
  } catch (error) {
    // Usually the columns are not there yet; the rest of the statements still work without them.
    console.error("Outside payments could not be read:", error);
    return [];
  }
}

/**
 * What the business holds for each owner and investor: the money they put in
 * as their own (costs and bills they paid counted as capital, and money they
 * added) and what the business still owes them (costs and bills they paid
 * counted as a loan, loans they gave, less what was paid back). Owner only.
 * @returns one row per person, or an empty list when none are set up
 */
export async function getPartnerSummaries(storeId: string): Promise<PartnerSummary[]> {
  try {
    const { data, error } = await supabase.from("money_partners").select("id, name, kind").eq("store_id", storeId).order("name");
    if (error) throw new Error(error.message);
    const partners = (data ?? []) as MoneyPartner[];
    if (partners.length === 0) return [];

    const [outside, entries] = await Promise.all([getOutsidePayments(storeId), getMoneyEntries(storeId)]);
    return partners.map((partner) => {
      let capital = 0;
      let owed = 0;
      for (const p of outside) {
        if (p.partnerId !== partner.id) continue;
        if (p.treatment === "capital") capital += p.amount;
        else owed += p.amount;
      }
      for (const e of entries) {
        if (e.partnerId !== partner.id) continue;
        if (e.entryType === "owner_investment") capital += e.amount;
        else if (e.entryType === "loan_received") owed += e.amount;
        else if (e.entryType === "loan_repayment") owed -= e.amount;
      }
      return { partner, capital, owed: Math.max(owed, 0) };
    });
  } catch (error) {
    console.error("Failed to load owner and investor totals:", error);
    return [];
  }
}
