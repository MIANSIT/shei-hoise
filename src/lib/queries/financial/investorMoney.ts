"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny, logActivity, requireOwner } from "@/lib/permissions/server";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { loadInvestorState, seedStartingCash, type InvestorState } from "./investorLedger";
import { currentPct, firstShareMonth } from "./investorMath";
import {
  START_METHODS,
  type AddInvestorMoneyInput,
  type ChangeSharePercentInput,
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
    previous: z.boolean().optional(),
  })
  .refine((v) => v.kind !== "profit_share" || (v.profitSharePct ?? 0) > 0, { message: "Enter the profit share percent" })
  .refine((v) => v.partnerId || (v.newPersonName ?? "").length > 0, { message: "Choose a person or enter a name" });

const payBackSchema = z.object({
  dealId: z.string().uuid(),
  amount: AMOUNT,
  interestAmount: z.number().min(0, "Interest cannot be negative").max(1_000_000_000, "Amount is too large").optional(),
  date: DATE,
  note: z.string().trim().max(300, "Note is too long").optional(),
});

const shareSchema = z.object({
  dealId: z.string().uuid(),
  month: MONTH,
  amount: AMOUNT,
  date: DATE,
  note: z.string().trim().max(300, "Note is too long").optional(),
});

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * The owner, on a plan that has the feature: opening_cash for the starting cash, investor_money for everything
 * about investors. The server checks it as well as the page, so a hidden feature cannot be used by calling it directly.
 */
async function ownerWithFeature(storeId: string, feature: "opening_cash" | "investor_money") {
  const auth = await requireOwner({ storeId });
  if (!auth.ok) return auth;
  if (!hasFeature(await getStoreFeatureSubscription(storeId), feature)) return { ok: false as const, error: "This is not part of your plan" };
  return auth;
}

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const money = (value: number): string => round2(value).toLocaleString("en-BD");

/**
 * Investor money is for the whole store, so a branch is optional. When one is named it must be this store's own.
 * @returns the branch id, null for the whole store, or false when the id is not this store's branch
 */
async function optionalBranch(storeId: string, branchId: string | null | undefined): Promise<string | null | false> {
  if (!branchId) return null;
  const { data } = await supabaseAdmin.from("store_branches").select("id").eq("id", branchId).eq("store_id", storeId).maybeSingle();
  return data ? (data.id as string) : false;
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
    const auth = await ownerWithFeature(storeId, "opening_cash");
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the amounts" };
    const v = parsed.data;
    if (v.asOfDate > dhakaToday()) return { success: false, error: "The date cannot be in the future" };

    // The starting cash is for the whole store unless a branch is named.
    const branch = await optionalBranch(storeId, v.branchId);
    if (branch === false) return { success: false, error: "Branch not found" };

    // Moving the start date later than an entry would leave that entry outside the new system.
    const { data: firstEntry } = await supabaseAdmin
      .from("investor_entries")
      .select("entry_date")
      .eq("store_id", storeId)
      .neq("entry_type", "previous_in")
      .order("entry_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstEntry && v.asOfDate > firstEntry.entry_date) {
      return { success: false, error: `Investor money was already recorded on ${firstEntry.entry_date}. Choose that date or an earlier one.` };
    }

    let existingQuery = supabaseAdmin.from("money_start").select("id, method").eq("store_id", storeId);
    existingQuery = branch ? existingQuery.eq("branch_id", branch) : existingQuery.is("branch_id", null);
    const { data: existing, error: readError } = await existingQuery;
    if (readError) return { success: false, error: readError.message };
    const idByMethod = new Map(((existing ?? []) as { id: string; method: string }[]).map((r) => [r.method, r.id]));

    for (const method of START_METHODS) {
      const row = {
        store_id: storeId,
        branch_id: branch,
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
      branchId: branch,
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
 * The Investor account goes up; sales and profit do not change. Money put in earlier (`previous`) can have any past
 * date and only counts as owed to the person, because it is already in the business.
 * @returns success, or why it failed
 */
export async function addInvestorMoney(storeId: string, input: AddInvestorMoneyInput): Promise<InvestorResult> {
  try {
    const auth = await ownerWithFeature(storeId, "investor_money");
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = addSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    let state = await loadInvestorState(storeId);
    // Money can be added before any starting cash is typed: the system then starts on that day with a starting
    // cash of zero, which can be changed on the same page later.
    if (!state.goLive) {
      if (v.date > dhakaToday()) return { success: false, error: "The date cannot be in the future" };
      const seedError = await seedStartingCash(storeId, auth.actor.userId, v.previous ? dhakaToday() : v.date, {});
      if (seedError) return { success: false, error: seedError };
      state = await loadInvestorState(storeId);
    }
    if (v.previous && v.date > dhakaToday()) return { success: false, error: "The date cannot be in the future" };
    const dateError = v.previous ? null : checkDate(v.date, state);
    if (dateError) return { success: false, error: dateError };

    // What this call created, so a failed save leaves nothing behind (a person with no money, or an empty deal).
    let createdPartnerId: string | null = null;
    let createdDealId: string | null = null;
    const undoCreated = async () => {
      if (createdDealId) await supabaseAdmin.from("investor_deals").delete().eq("id", createdDealId).eq("store_id", storeId);
      if (createdPartnerId) await supabaseAdmin.from("money_partners").delete().eq("id", createdPartnerId).eq("store_id", storeId);
    };

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
      createdPartnerId = partner.id;
    }

    const pct = v.kind === "profit_share" ? round2(v.profitSharePct ?? 0) : null;
    const deal = state.deals.find((d) => d.partnerId === partner.id && d.kind === v.kind && (d.kind !== "profit_share" || currentPct(d) === pct));
    let dealId = deal?.id ?? null;
    if (!dealId) {
      const { data, error } = await supabaseAdmin
        .from("investor_deals")
        .insert({ store_id: storeId, partner_id: partner.id, kind: v.kind, profit_share_pct: pct, created_by: auth.actor.userId })
        .select("id")
        .single();
      if (error || !data) {
        await undoCreated();
        return { success: false, error: error?.message ?? "Could not save" };
      }
      dealId = data.id as string;
      createdDealId = dealId;
    }

    const { data: entry, error } = await supabaseAdmin
      .from("investor_entries")
      .insert({
        store_id: storeId,
        deal_id: dealId,
        entry_type: v.previous ? "previous_in" : "put_in",
        amount: round2(v.amount),
        entry_date: v.date,
        note: v.note || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) {
      await undoCreated();
      return { success: false, error: error.message };
    }

    await logActivity(auth.actor, {
      action: v.previous ? "investor.previous_in" : "investor.put_in",
      entityType: "investor_entry",
      entityId: entry?.id ?? null,
      summary: `${partner.name} ${v.previous ? "had put in earlier" : "put in"} ৳${money(v.amount)} (${v.kind === "loan" ? "loan" : v.kind === "profit_share" ? `investment, ${pct}% profit share` : "investment, payback"})`,
      details: { entry_date: v.date, kind: v.kind, profit_share_pct: pct },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }
}

/**
 * Pays an investor back. A loan is repaid in parts, with optional interest; an investment is paid back in any amount
 * and the capital left is shown. It all comes out of the Investor account, which can go below zero, so Business cash,
 * sales and profit never change.
 * @returns success, or why it failed
 */
export async function payInvestorBack(storeId: string, input: PayInvestorBackInput): Promise<InvestorResult> {
  try {
    const auth = await ownerWithFeature(storeId, "investor_money");
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

    const created: string[] = [];
    const undo = async () => {
      if (created.length > 0) await supabaseAdmin.from("investor_entries").delete().in("id", created).eq("store_id", storeId);
    };
    for (const part of [
      { amount: principal, type: isLoan ? "repay" : "pay_back" },
      { amount: interest, type: "interest" },
    ]) {
      if (part.amount <= 0.005) continue;
      const { data, error } = await supabaseAdmin
        .from("investor_entries")
        .insert({
          store_id: storeId,
          deal_id: deal.id,
          entry_type: part.type,
          amount: part.amount,
          entry_date: v.date,
          pay_from: "investor",
          note: v.note || null,
          created_by: auth.actor.userId,
        })
        .select("id")
        .single();
      if (error || !data) {
        // Do not leave half of the payment saved.
        await undo();
        return { success: false, error: error?.message ?? "Could not save" };
      }
      created.push(data.id as string);
    }

    await logActivity(auth.actor, {
      action: "investor.pay_back",
      entityType: "investor_entry",
      entityId: created[0] ?? null,
      summary: `Paid ${position.partner.name} back ৳${money(v.amount)} (${isLoan ? "loan" : "investment"}) from the Investor account${interest > 0.005 ? `, of which interest ৳${money(interest)}` : ""}`,
      details: { entry_date: v.date, interest },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }
}

/**
 * Pays a profit share for one month. It comes out of the Investor account, which can go below zero, so Business cash
 * and profit do not change.
 * @returns success, or why it failed
 */
export async function payProfitShare(storeId: string, input: PayProfitShareInput): Promise<InvestorResult> {
  try {
    const auth = await ownerWithFeature(storeId, "investor_money");
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

    const { data: entry, error } = await supabaseAdmin
      .from("investor_entries")
      .insert({
        store_id: storeId,
        deal_id: deal.id,
        entry_type: "profit_share_paid",
        amount: round2(v.amount),
        entry_date: v.date,
        pay_from: "investor",
        period_month: v.month,
        note: v.note || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "investor.profit_share",
      entityType: "investor_entry",
      entityId: entry?.id ?? null,
      summary: `Paid ${position.partner.name} a profit share of ৳${money(v.amount)} for ${v.month} from the Investor account`,
      details: { entry_date: v.date, month: v.month },
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
    const auth = await ownerWithFeature(storeId, "investor_money");
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
    if (entry.type === "previous_in") {
      const deal = state.positions.partners.flatMap((p) => p.deals).find((d) => d.deal.id === entry.dealId);
      if (!deal || deal.putIn - deal.paidBack - entry.amount < -0.005) {
        return { success: false, error: "This money has already been paid back, so it cannot be removed." };
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

const changePctSchema = z.object({
  dealId: z.string().uuid(),
  pct: z.number().gt(0, "Enter a percent above zero").max(100, "A share cannot be more than 100%"),
  fromMonth: MONTH,
});

/**
 * Changes a profit share percent from a month on. Months before it keep the old percent, and a month that already
 * has a share paid cannot be changed, so what was paid always matches the percent it was worked out with.
 * @returns success, or why it failed
 */
export async function changeProfitSharePercent(storeId: string, input: ChangeSharePercentInput): Promise<InvestorResult> {
  try {
    const auth = await ownerWithFeature(storeId, "investor_money");
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = changePctSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const state = await loadInvestorState(storeId);
    const deal = state.deals.find((d) => d.id === v.dealId);
    if (!deal || deal.kind !== "profit_share") return { success: false, error: "That profit share was not found" };
    if (v.fromMonth > dhakaToday().slice(0, 7)) return { success: false, error: "The new percent can start this month at the latest" };

    const mine = state.entries.filter((e) => e.dealId === deal.id);
    const firstMonth = firstShareMonth(mine, deal.id, state.goLive);
    if (firstMonth && v.fromMonth < firstMonth) return { success: false, error: `This investment started in ${firstMonth}. Choose that month or a later one.` };
    const paidMonths = mine.filter((e) => e.type === "profit_share_paid" && e.periodMonth).map((e) => e.periodMonth as string).sort();
    const lastPaid = paidMonths[paidMonths.length - 1];
    if (lastPaid && v.fromMonth <= lastPaid) return { success: false, error: `A share was already paid for ${lastPaid}. Choose a later month.` };

    // One change per month: choosing the same month again replaces it.
    const { error: clearError } = await supabaseAdmin.from("investor_deal_rates").delete().eq("deal_id", deal.id).eq("store_id", storeId).eq("from_month", v.fromMonth);
    if (clearError) return { success: false, error: clearError.message };
    const { error } = await supabaseAdmin
      .from("investor_deal_rates")
      .insert({ store_id: storeId, deal_id: deal.id, from_month: v.fromMonth, profit_share_pct: round2(v.pct), created_by: auth.actor.userId });
    if (error) return { success: false, error: error.message };

    const name = state.partners.find((p) => p.id === deal.partnerId)?.name ?? "";
    await logActivity(auth.actor, {
      action: "investor.share_percent",
      entityType: "investor_deal",
      entityId: deal.id,
      summary: `Changed ${name}'s profit share to ${round2(v.pct)}% from ${v.fromMonth}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }
}

/**
 * Deletes a person who has no money records. Someone who put money in, was paid back, or paid an expense or supplier
 * bill from the Investor account is kept, so your books stay complete: delete their entries first, or leave them.
 * @returns success, or why it failed
 */
export async function deleteInvestorPerson(storeId: string, partnerId: string): Promise<InvestorResult> {
  try {
    const auth = await ownerWithFeature(storeId, "investor_money");
    if (!auth.ok) return { success: false, error: auth.error };
    if (!z.string().uuid().safeParse(partnerId).success) return { success: false, error: "That person was not found" };

    const state = await loadInvestorState(storeId);
    const partner = state.partners.find((p) => p.id === partnerId);
    if (!partner) return { success: false, error: "That person was not found" };

    const dealIds = new Set(state.deals.filter((d) => d.partnerId === partnerId).map((d) => d.id));
    if (state.entries.some((e) => dealIds.has(e.dealId))) {
      return { success: false, error: `${partner.name} has money records. Delete their entries in History first, or keep them for your books.` };
    }
    // Payments made from this person's account, also from before the system started.
    const [{ count: expenseCount }, { count: ledgerCount }] = await Promise.all([
      supabaseAdmin.from("expenses").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("funder_id", partnerId),
      supabaseAdmin.from("supplier_ledger").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("funder_id", partnerId),
    ]);
    if ((expenseCount ?? 0) > 0 || (ledgerCount ?? 0) > 0) {
      return { success: false, error: `${partner.name} paid expenses or supplier bills from the Investor account, so they cannot be deleted.` };
    }

    const { error } = await supabaseAdmin.from("money_partners").delete().eq("id", partnerId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "investor.person_delete",
      entityType: "money_partner",
      entityId: partnerId,
      summary: `Deleted ${partner.name} from the investor list`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete" };
  }
}
