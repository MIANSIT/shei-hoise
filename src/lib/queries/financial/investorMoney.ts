"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny, logActivity, requireOwner } from "@/lib/permissions/server";
import { loadInvestorState, type InvestorState } from "./investorLedger";
import {
  START_METHODS,
  type AddInvestorMoneyInput,
  type InvestorAvailable,
  type InvestorOverview,
  type InvestorResult,
  type PayInvestorBackInput,
  type PayProfitShareInput,
  type StartingCashInput,
} from "./investorMoneyTypes";
import type { MoneyPartner } from "./moneyPartnerTypes";

/**
 * Investor money: the starting cash, money people put in (a loan, a profit-share investment or a payback
 * investment), paying them back, and profit shares. Owner only; staff can only see what each investor still
 * has in the Investor account, to choose whose money pays an expense or a supplier bill.
 */

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");
const MONTH = z.string().regex(/^\d{4}-\d{2}$/, "Choose a valid month");
const AMOUNT = z.number().positive("Enter an amount above zero").max(1_000_000_000, "Amount is too large");
const METHOD = z.enum(START_METHODS);

const startSchema = z.object({
  asOfDate: DATE,
  branchId: z.string().uuid().nullable().optional(),
  amounts: z.record(z.string(), z.number().min(0, "Amounts cannot be negative").max(1_000_000_000, "Amount is too large").optional()),
});

const addSchema = z
  .object({
    partnerId: z.string().uuid().nullable().optional(),
    newPersonName: z.string().trim().max(80, "Name is too long").optional(),
    newPersonKind: z.enum(["owner", "investor"]).optional(),
    kind: z.enum(["loan", "profit_share", "payback"]),
    profitSharePct: z.number().gt(0, "Enter a percent above zero").max(100, "A share cannot be more than 100%").nullable().optional(),
    amount: AMOUNT,
    date: DATE,
    note: z.string().trim().max(300, "Note is too long").optional(),
  })
  .refine((v) => v.kind !== "profit_share" || (v.profitSharePct ?? 0) > 0, { message: "Enter the profit share percent" })
  .refine((v) => v.partnerId || (v.newPersonName ?? "").length > 0, { message: "Choose a person or enter a name" });

const payBackSchema = z.object({
  dealId: z.string().uuid(),
  amount: AMOUNT,
  interestAmount: z.number().min(0, "Interest cannot be negative").max(1_000_000_000, "Amount is too large").optional(),
  payFrom: z.enum(["business", "investor"]),
  method: METHOD,
  branchId: z.string().uuid().nullable().optional(),
  date: DATE,
  note: z.string().trim().max(300, "Note is too long").optional(),
});

const shareSchema = z.object({
  dealId: z.string().uuid(),
  month: MONTH,
  amount: AMOUNT,
  payFrom: z.enum(["business", "investor"]),
  method: METHOD,
  branchId: z.string().uuid().nullable().optional(),
  date: DATE,
  note: z.string().trim().max(300, "Note is too long").optional(),
});

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const money = (value: number): string => round2(value).toLocaleString("en-BD");

/**
 * A store with branches keeps its business cash branch by branch, so a payment from business cash has to say
 * which one. The id comes from the browser, so it must be this store's.
 * @returns the branch id to save (null for a store without branches), or an error
 */
async function resolveBranch(
  storeId: string,
  branchId: string | null | undefined,
): Promise<{ ok: true; branchId: string | null } | { ok: false; error: string }> {
  if (branchId) {
    const { data: branch } = await supabaseAdmin.from("store_branches").select("id").eq("id", branchId).eq("store_id", storeId).maybeSingle();
    if (!branch) return { ok: false, error: "Branch not found" };
    return { ok: true, branchId: branch.id };
  }
  const { count } = await supabaseAdmin.from("store_branches").select("id", { count: "exact", head: true }).eq("store_id", storeId);
  if ((count ?? 0) > 0) return { ok: false, error: "Choose which branch's money paid this" };
  return { ok: true, branchId: null };
}

/** The date must fall between the day the system started and today. */
function checkDate(date: string, state: InvestorState): string | null {
  if (!state.goLive) return "Save your starting cash first";
  if (date < state.goLive) return "That date is before the starting cash date";
  if (date > dhakaToday()) return "The date cannot be in the future";
  return null;
}

/**
 * Everything on the Investor money page: the starting cash, the people with their deals, every entry since the
 * start, and what each person still has in the Investor account. Owner only.
 * @returns the overview, or null when not allowed or on failure
 */
export async function getInvestorOverview(storeId: string): Promise<InvestorOverview | null> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return null;
    const state = await loadInvestorState(storeId);
    return {
      goLive: state.goLive,
      start: state.start,
      deals: state.deals,
      entries: [...state.entries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
      positions: state.positions,
    };
  } catch (error) {
    console.error("getInvestorOverview failed:", error);
    return null;
  }
}

/**
 * The people who can pay from the Investor account, with what each still has in it. Anyone who can enter an
 * expense or a supplier payment can read it, so they can choose whose money pays.
 * @returns the people by name, or an empty list when not allowed or on failure
 */
export async function getInvestorAvailable(storeId: string): Promise<InvestorAvailable[]> {
  try {
    const auth = await authorizeForStoreAny(storeId, ["expenses.add", "expenses.edit", "stock.supplier_money"]);
    if (!auth.ok) return [];
    const state = await loadInvestorState(storeId);
    return state.positions.partners.map((p) => ({ partner: p.partner, available: p.available }));
  } catch (error) {
    console.error("getInvestorAvailable failed:", error);
    return [];
  }
}

/**
 * Saves the starting cash: what the business held on each payment method at the end of a day. Saving again
 * replaces the earlier numbers for that branch. The earliest date is the day the new system starts.
 * @returns success, or why it failed
 */
export async function saveStartingCash(storeId: string, input: StartingCashInput): Promise<InvestorResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the amounts" };
    const v = parsed.data;
    if (v.asOfDate > dhakaToday()) return { success: false, error: "The date cannot be in the future" };

    const branch = await resolveBranch(storeId, v.branchId);
    if (!branch.ok) return { success: false, error: branch.error };

    // Moving the start date later than an entry would leave that entry outside the new system.
    const { data: firstEntry } = await supabaseAdmin
      .from("investor_entries")
      .select("entry_date")
      .eq("store_id", storeId)
      .order("entry_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstEntry && v.asOfDate > firstEntry.entry_date) {
      return { success: false, error: `Investor money was already recorded on ${firstEntry.entry_date}. Choose that date or an earlier one.` };
    }

    let existingQuery = supabaseAdmin.from("money_start").select("id, method").eq("store_id", storeId);
    existingQuery = branch.branchId ? existingQuery.eq("branch_id", branch.branchId) : existingQuery.is("branch_id", null);
    const { data: existing, error: readError } = await existingQuery;
    if (readError) return { success: false, error: readError.message };
    const idByMethod = new Map(((existing ?? []) as { id: string; method: string }[]).map((r) => [r.method, r.id]));

    for (const method of START_METHODS) {
      const row = {
        store_id: storeId,
        branch_id: branch.branchId,
        method,
        amount: round2(v.amounts[method] ?? 0),
        as_of_date: v.asOfDate,
        created_by: auth.actor.userId,
        updated_at: new Date().toISOString(),
      };
      const id = idByMethod.get(method);
      const { error } = id
        ? await supabaseAdmin.from("money_start").update(row).eq("id", id).eq("store_id", storeId)
        : await supabaseAdmin.from("money_start").insert(row);
      if (error) return { success: false, error: error.message };
    }

    await logActivity(auth.actor, {
      action: "investor.starting_cash",
      branchId: branch.branchId,
      entityType: "money_start",
      entityId: null,
      summary: `Starting cash saved as of ${v.asOfDate}`,
      details: { as_of_date: v.asOfDate, amounts: v.amounts },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the starting cash" };
  }
}

/**
 * Adds money a person gave: a loan, an investment that shares profit, or an investment that is paid back.
 * The Investor account goes up; sales and profit do not change.
 * @returns success, or why it failed
 */
export async function addInvestorMoney(storeId: string, input: AddInvestorMoneyInput): Promise<InvestorResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = addSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const state = await loadInvestorState(storeId);
    const dateError = checkDate(v.date, state);
    if (dateError) return { success: false, error: dateError };

    let partner: MoneyPartner | undefined = v.partnerId ? state.partners.find((p) => p.id === v.partnerId) : undefined;
    if (v.partnerId && !partner) return { success: false, error: "That person is not on the list" };
    if (!partner) {
      const { data, error } = await supabaseAdmin
        .from("money_partners")
        .insert({ store_id: storeId, name: v.newPersonName, kind: v.newPersonKind ?? "investor" })
        .select("id, name, kind")
        .single();
      if (error) {
        if (error.code === "23505") return { success: false, error: "Someone with that name is already on the list" };
        return { success: false, error: error.message };
      }
      partner = data as MoneyPartner;
    }

    const pct = v.kind === "profit_share" ? round2(v.profitSharePct ?? 0) : null;
    const deal = state.deals.find((d) => d.partnerId === partner.id && d.kind === v.kind && (d.profitSharePct ?? null) === pct);
    let dealId = deal?.id ?? null;
    if (!dealId) {
      const { data, error } = await supabaseAdmin
        .from("investor_deals")
        .insert({ store_id: storeId, partner_id: partner.id, kind: v.kind, profit_share_pct: pct, created_by: auth.actor.userId })
        .select("id")
        .single();
      if (error || !data) return { success: false, error: error?.message ?? "Could not save" };
      dealId = data.id as string;
    }

    const { data: entry, error } = await supabaseAdmin
      .from("investor_entries")
      .insert({
        store_id: storeId,
        deal_id: dealId,
        entry_type: "put_in",
        amount: round2(v.amount),
        entry_date: v.date,
        note: v.note || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "investor.put_in",
      entityType: "investor_entry",
      entityId: entry?.id ?? null,
      summary: `${partner.name} put in ৳${money(v.amount)} (${v.kind === "loan" ? "loan" : v.kind === "profit_share" ? `investment, ${pct}% profit share` : "investment, payback"})`,
      details: { entry_date: v.date, kind: v.kind, profit_share_pct: pct },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }
}

/** The interest part of a loan payment, saved as an expense named "Loan interest". */
async function saveLoanInterestExpense(
  storeId: string,
  input: { amount: number; date: string; method: string; branchId: string | null; note: string | null; investorId: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabaseAdmin
    .from("expense_categories")
    .select("id")
    .eq("store_id", storeId)
    .ilike("name", "Loan interest")
    .limit(1)
    .maybeSingle();
  let categoryId: string | null = existing?.id ?? null;
  if (!categoryId) {
    const { data: created, error: categoryError } = await supabaseAdmin
      .from("expense_categories")
      .insert({ store_id: storeId, name: "Loan interest", description: "Interest paid on loans", is_default: false })
      .select("id")
      .single();
    if (categoryError || !created) return { ok: false, error: categoryError?.message ?? "Could not create the Loan interest category" };
    categoryId = created.id;
  }
  const { error } = await supabaseAdmin.from("expenses").insert({
    store_id: storeId,
    category_id: categoryId,
    amount: input.amount,
    title: "Loan interest",
    expense_date: input.date,
    payment_method: input.method,
    // Paid from the Investor account: it takes from that person's money. Otherwise it is a business cost.
    paid_from: input.investorId ? "outside" : "shop",
    notes: input.note,
    ...(input.investorId ? { funder_id: input.investorId, funder_treatment: "capital" } : {}),
    ...(!input.investorId && input.branchId ? { branch_id: input.branchId } : {}),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Pays an investor back. A loan is repaid in parts (the interest part is a cost); an investment is paid back in
 * any amount and the capital left is shown. It is paid from business cash or from the Investor account.
 * @returns success, or why it failed
 */
export async function payInvestorBack(storeId: string, input: PayInvestorBackInput): Promise<InvestorResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = payBackSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const state = await loadInvestorState(storeId);
    const dateError = checkDate(v.date, state);
    if (dateError) return { success: false, error: dateError };

    const deal = state.deals.find((d) => d.id === v.dealId);
    if (!deal) return { success: false, error: "That deal was not found" };
    const position = state.positions.partners.find((p) => p.partner.id === deal.partnerId);
    const dealPosition = position?.deals.find((d) => d.deal.id === deal.id);
    if (!position || !dealPosition) return { success: false, error: "That deal was not found" };

    const isLoan = deal.kind === "loan";
    const interest = isLoan ? round2(v.interestAmount ?? 0) : 0;
    if (!isLoan && (v.interestAmount ?? 0) > 0) return { success: false, error: "Only a loan can have interest" };
    if (interest > v.amount + 0.005) return { success: false, error: "The interest cannot be more than the amount paid" };
    const principal = round2(v.amount - interest);
    if (principal <= 0.005) return { success: false, error: "Enter an amount above the interest" };
    if (principal > dealPosition.left + 0.005) {
      return {
        success: false,
        error: isLoan
          ? `${position.partner.name} is owed ${money(dealPosition.left)} on this loan. You cannot repay more.`
          : `${position.partner.name} has ${money(dealPosition.left)} invested here. You cannot pay back more.`,
      };
    }
    if (v.payFrom === "investor" && v.amount > position.available + 0.005) {
      return { success: false, error: `${position.partner.name} has ${money(Math.max(position.available, 0))} in the Investor account. Pay from business cash instead.` };
    }

    let branchId: string | null = null;
    if (v.payFrom === "business") {
      const branch = await resolveBranch(storeId, v.branchId);
      if (!branch.ok) return { success: false, error: branch.error };
      branchId = branch.branchId;
    }

    const { data: entry, error } = await supabaseAdmin
      .from("investor_entries")
      .insert({
        store_id: storeId,
        deal_id: deal.id,
        entry_type: isLoan ? "repay" : "pay_back",
        amount: principal,
        entry_date: v.date,
        pay_from: v.payFrom,
        payment_method: v.payFrom === "business" ? v.method : null,
        branch_id: branchId,
        note: v.note || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    if (interest > 0.005) {
      const expense = await saveLoanInterestExpense(storeId, {
        amount: interest,
        date: v.date,
        method: v.method,
        branchId,
        note: v.note || null,
        investorId: v.payFrom === "investor" ? position.partner.id : null,
      });
      if (!expense.ok) {
        // Do not leave half of the payment saved.
        if (entry?.id) await supabaseAdmin.from("investor_entries").delete().eq("id", entry.id).eq("store_id", storeId);
        return { success: false, error: expense.error };
      }
    }

    await logActivity(auth.actor, {
      action: "investor.pay_back",
      branchId,
      entityType: "investor_entry",
      entityId: entry?.id ?? null,
      summary: `Paid ${position.partner.name} back ৳${money(v.amount)} (${isLoan ? "loan" : "investment"}) from ${v.payFrom === "business" ? "business cash" : "the Investor account"}${interest > 0.005 ? `, of which interest ৳${money(interest)}` : ""}`,
      details: { entry_date: v.date, interest, pay_from: v.payFrom },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }
}

/**
 * Pays a profit share for one month. It is a split of profit already made, so profit does not change. It is paid
 * from business cash or from the Investor account.
 * @returns success, or why it failed
 */
export async function payProfitShare(storeId: string, input: PayProfitShareInput): Promise<InvestorResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = shareSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const state = await loadInvestorState(storeId);
    const dateError = checkDate(v.date, state);
    if (dateError) return { success: false, error: dateError };

    const deal = state.deals.find((d) => d.id === v.dealId);
    if (!deal || deal.kind !== "profit_share") return { success: false, error: "That profit share was not found" };
    const position = state.positions.partners.find((p) => p.partner.id === deal.partnerId);
    if (!position) return { success: false, error: "That profit share was not found" };
    if (v.payFrom === "investor" && v.amount > position.available + 0.005) {
      return { success: false, error: `${position.partner.name} has ${money(Math.max(position.available, 0))} in the Investor account. Pay from business cash instead.` };
    }

    let branchId: string | null = null;
    if (v.payFrom === "business") {
      const branch = await resolveBranch(storeId, v.branchId);
      if (!branch.ok) return { success: false, error: branch.error };
      branchId = branch.branchId;
    }

    const { data: entry, error } = await supabaseAdmin
      .from("investor_entries")
      .insert({
        store_id: storeId,
        deal_id: deal.id,
        entry_type: "profit_share_paid",
        amount: round2(v.amount),
        entry_date: v.date,
        pay_from: v.payFrom,
        payment_method: v.payFrom === "business" ? v.method : null,
        branch_id: branchId,
        period_month: v.month,
        note: v.note || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "investor.profit_share",
      branchId,
      entityType: "investor_entry",
      entityId: entry?.id ?? null,
      summary: `Paid ${position.partner.name} a profit share of ৳${money(v.amount)} for ${v.month} from ${v.payFrom === "business" ? "business cash" : "the Investor account"}`,
      details: { entry_date: v.date, month: v.month, pay_from: v.payFrom },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }
}

/**
 * Deletes an investor entry that was a mistake. Money that was put in cannot be removed once it has been paid
 * back or spent, because the balances would go below zero.
 * @returns success, or why it failed
 */
export async function deleteInvestorEntry(storeId: string, entryId: string): Promise<InvestorResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };
    if (!z.string().uuid().safeParse(entryId).success) return { success: false, error: "Entry not found" };

    const state = await loadInvestorState(storeId);
    const entry = state.entries.find((e) => e.id === entryId);
    if (!entry) return { success: false, error: "Entry not found" };

    if (entry.type === "put_in") {
      const deal = state.deals.find((d) => d.id === entry.dealId);
      const position = state.positions.partners.find((p) => p.partner.id === deal?.partnerId);
      const dealPosition = position?.deals.find((d) => d.deal.id === entry.dealId);
      if (!position || !dealPosition || position.available - entry.amount < -0.005 || dealPosition.putIn - dealPosition.paidBack - entry.amount < -0.005) {
        return { success: false, error: "This money has already been paid back or spent, so it cannot be removed." };
      }
    }

    const { error } = await supabaseAdmin.from("investor_entries").delete().eq("id", entryId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "investor.delete",
      entityType: "investor_entry",
      entityId: entryId,
      summary: `Deleted an investor entry of ৳${money(entry.amount)} (${entry.type})`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete" };
  }
}
