import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { computeInvestorPositions } from "./investorMath";
import type {
  InvestorDeal,
  InvestorEntry,
  InvestorEntryType,
  InvestorKind,
  InvestorPositions,
  InvestorSpend,
  PayFrom,
  StartMethod,
  StartingCashRow,
} from "./investorMoneyTypes";
import type { MoneyPartner } from "./moneyPartnerTypes";

/*
 * Reads the investor records with the service role, for the server actions and for checking a payment
 * "from the Investor account". Server-only helper, not a "use server" file, so the browser cannot call it.
 */

interface StartDbRow {
  method: string;
  amount: number;
  as_of_date: string;
  branch_id: string | null;
}
interface DealDbRow {
  id: string;
  partner_id: string;
  kind: string;
  profit_share_pct: number | null;
  note: string | null;
}
interface EntryDbRow {
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
}

/** A payment from the Investor account on an expense or a supplier bill, with where it lives. */
export interface InvestorSpendRecord extends InvestorSpend {
  source: "expense" | "supplier";
  id: string;
}

export interface InvestorState {
  goLive: string | null;
  start: StartingCashRow[];
  partners: MoneyPartner[];
  deals: InvestorDeal[];
  entries: InvestorEntry[];
  spends: InvestorSpendRecord[];
  positions: InvestorPositions;
}

/** The store's starting cash rows (all branches). */
export async function loadStart(storeId: string): Promise<StartingCashRow[]> {
  const { data } = await supabaseAdmin.from("money_start").select("method, amount, as_of_date, branch_id").eq("store_id", storeId);
  return ((data ?? []) as StartDbRow[]).map((r) => ({
    method: r.method as StartMethod,
    amount: Number(r.amount),
    asOfDate: r.as_of_date,
    branchId: r.branch_id,
  }));
}

/** The day the new system started: the earliest starting-cash date, or null before it is set up. */
export function goLiveOf(start: StartingCashRow[]): string | null {
  return start.length === 0 ? null : start.reduce((min, r) => (r.asOfDate < min ? r.asOfDate : min), start[0].asOfDate);
}

/**
 * Everything the Investor account depends on, for one store: people, deals, entries and the expenses and
 * supplier payments paid from the Investor account, all dated on or after the day the system started.
 * @param exclude records to leave out, so an edit can be checked without counting itself twice
 */
export async function loadInvestorState(
  storeId: string,
  exclude: { expenseId?: string | null; ledgerIds?: readonly string[] } = {},
): Promise<InvestorState> {
  const start = await loadStart(storeId);
  const goLive = goLiveOf(start);

  const { data: partnerRows } = await supabaseAdmin.from("money_partners").select("id, name, kind").eq("store_id", storeId).order("name");
  const partners = (partnerRows ?? []) as MoneyPartner[];

  const { data: dealRows } = await supabaseAdmin.from("investor_deals").select("id, partner_id, kind, profit_share_pct, note").eq("store_id", storeId);
  const deals: InvestorDeal[] = ((dealRows ?? []) as DealDbRow[]).map((d) => ({
    id: d.id,
    partnerId: d.partner_id,
    kind: d.kind as InvestorKind,
    profitSharePct: d.profit_share_pct === null ? null : Number(d.profit_share_pct),
    note: d.note,
  }));

  // Changes of a profit share percent. Before migration 20261204 the read fails and every deal keeps its starting percent.
  const { data: rateRows } = await supabaseAdmin.from("investor_deal_rates").select("deal_id, from_month, profit_share_pct").eq("store_id", storeId);
  const ratesByDeal = new Map<string, { fromMonth: string; pct: number }[]>();
  for (const r of (rateRows ?? []) as { deal_id: string; from_month: string; profit_share_pct: number }[]) {
    const list = ratesByDeal.get(r.deal_id) ?? [];
    list.push({ fromMonth: r.from_month, pct: Number(r.profit_share_pct) });
    ratesByDeal.set(r.deal_id, list);
  }
  for (const d of deals) d.rates = (ratesByDeal.get(d.id) ?? []).sort((a, b) => (a.fromMonth < b.fromMonth ? -1 : 1));

  let entries: InvestorEntry[] = [];
  const spends: InvestorSpendRecord[] = [];
  if (goLive) {
    const entryRows = await fetchAllPaged<EntryDbRow>((from, to) =>
      supabaseAdmin
        .from("investor_entries")
        .select("id, deal_id, entry_type, amount, entry_date, pay_from, payment_method, branch_id, period_month, note")
        .eq("store_id", storeId)
        .gte("entry_date", goLive)
        .order("id")
        .range(from, to),
    );
    entries = entryRows.map((e) => ({
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

    const expenseRows = await fetchAllPaged<{ id: string; amount: number; expense_date: string; funder_id: string }>((from, to) =>
      supabaseAdmin
        .from("expenses")
        .select("id, amount, expense_date, funder_id")
        .eq("store_id", storeId)
        .eq("paid_from", "outside")
        .not("funder_id", "is", null)
        .gte("expense_date", goLive)
        .order("id")
        .range(from, to),
    );
    for (const r of expenseRows) {
      if (r.id === exclude.expenseId) continue;
      spends.push({ source: "expense", id: r.id, partnerId: r.funder_id, amount: Number(r.amount), date: r.expense_date });
    }

    const ledgerRows = await fetchAllPaged<{ id: string; amount: number; entry_date: string; funder_id: string }>((from, to) =>
      supabaseAdmin
        .from("supplier_ledger")
        .select("id, amount, entry_date, funder_id")
        .eq("store_id", storeId)
        .eq("kind", "payment")
        .eq("paid_from", "outside")
        .not("funder_id", "is", null)
        .gte("entry_date", goLive)
        .order("id")
        .range(from, to),
    );
    const skip = new Set(exclude.ledgerIds ?? []);
    for (const r of ledgerRows) {
      if (skip.has(r.id)) continue;
      spends.push({ source: "supplier", id: r.id, partnerId: r.funder_id, amount: Number(r.amount), date: r.entry_date });
    }
  }

  const positions = computeInvestorPositions(partners, deals, entries, spends);
  return { goLive, start, partners, deals, entries, spends, positions };
}

/**
 * What one person still has in the Investor account.
 * @returns the amount, or 0 when the person or the starting cash is missing
 */
export async function getPartnerAvailable(
  storeId: string,
  partnerId: string,
  exclude: { expenseId?: string | null; ledgerIds?: readonly string[] } = {},
): Promise<{ name: string; available: number } | null> {
  const state = await loadInvestorState(storeId, exclude);
  const position = state.positions.partners.find((p) => p.partner.id === partnerId);
  return position ? { name: position.partner.name, available: position.available } : null;
}

/**
 * Saves the starting cash of a new store (whole store, no branch), counted at the end of `asOfDate`.
 * Used when a store is created, so Business cash starts from what the owner typed. Zero amounts are saved too,
 * so the day the system started is always recorded.
 * @returns an error message, or null when saved
 */
export async function seedStartingCash(
  storeId: string,
  createdBy: string | null,
  asOfDate: string,
  amounts: Partial<Record<StartMethod, number>>,
): Promise<string | null> {
  const rows = (["cash", "mobile_banking", "bank_transfer"] as const).map((method) => ({
    store_id: storeId,
    branch_id: null,
    method,
    amount: Math.max(Math.round((amounts[method] ?? 0) * 100) / 100, 0),
    as_of_date: asOfDate,
    created_by: createdBy,
  }));
  const { error } = await supabaseAdmin.from("money_start").insert(rows);
  return error ? error.message : null;
}
