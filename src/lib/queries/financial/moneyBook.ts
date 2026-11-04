"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity, requireOwner } from "@/lib/permissions/server";
import {
  MONEY_METHODS,
  type CashCountInput,
  type MoneyBookResult,
  type MoneyEntryInput,
  type OpeningBalancesInput,
  type OpeningLine,
} from "./moneyBookTypes";

/**
 * Starting balances and the money-in / money-out types Money Overview does not
 * have. Owner only, like owner withdrawals: staff can neither record nor see them.
 */

const OPENING_LINES: readonly OpeningLine[] = [...MONEY_METHODS, "fixed_assets", "loans"];
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");
const AMOUNT = z.number().min(0, "Amounts cannot be negative").max(1_000_000_000, "Amount is too large");

const openingSchema = z.object({
  asOfDate: DATE,
  branchId: z.string().uuid().nullable().optional(),
  amounts: z.record(z.string(), AMOUNT.optional()),
});

const entrySchema = z.object({
  kind: z.enum(["in", "out"]),
  entryType: z.enum(["owner_investment", "loan_received", "other_income", "loan_repayment", "equipment_purchase"]),
  amount: z.number().positive("Enter an amount above zero").max(1_000_000_000, "Amount is too large"),
  paymentMethod: z.enum(MONEY_METHODS),
  date: DATE,
  note: z.string().trim().max(300, "Note is too long").optional(),
  branchId: z.string().uuid().nullable().optional(),
  partnerId: z.string().uuid().nullable().optional(),
  interestAmount: z.number().min(0, "Interest cannot be negative").max(1_000_000_000, "Amount is too large").optional(),
});

const countSchema = z.object({
  date: DATE,
  branchId: z.string().uuid().nullable().optional(),
  counted: AMOUNT,
  expected: z.number().min(-1_000_000_000).max(1_000_000_000),
  note: z.string().trim().max(300, "Note is too long").optional(),
});

/** In: owner_investment, loan_received, other_income. Out: loan_repayment, equipment_purchase. */
const IN_TYPES = new Set(["owner_investment", "loan_received", "other_income"]);
/** Types that can have an owner or investor behind them. */
const PARTNER_TYPES = new Set(["owner_investment", "loan_received", "loan_repayment"]);

/**
 * A store with branches keeps its money branch by branch, so every record has
 * to say which one. The id comes from the browser, so it must be this store's.
 * @returns the branch id to save (null for a store without branches), or an error
 */
async function resolveBranch(
  storeId: string,
  branchId: string | null | undefined,
): Promise<{ ok: true; branchId: string | null } | { ok: false; error: string }> {
  if (branchId) {
    const { data: branch } = await supabaseAdmin
      .from("store_branches")
      .select("id")
      .eq("id", branchId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!branch) return { ok: false, error: "Branch not found" };
    return { ok: true, branchId: branch.id };
  }
  const { count } = await supabaseAdmin
    .from("store_branches")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if ((count ?? 0) > 0) return { ok: false, error: "Choose which branch this is for" };
  return { ok: true, branchId: null };
}

/**
 * Saves what the business held on a start date: money on each payment method,
 * the equipment it already owned and the loans it already owed. Saving again
 * replaces the earlier numbers for that branch.
 * @returns success, or why it failed
 */
export async function saveOpeningBalances(storeId: string, input: OpeningBalancesInput): Promise<MoneyBookResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = openingSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the amounts" };
    const v = parsed.data;

    const branch = await resolveBranch(storeId, v.branchId);
    if (!branch.ok) return { success: false, error: branch.error };

    let existingQuery = supabaseAdmin.from("money_opening_balances").select("id, line").eq("store_id", storeId);
    existingQuery = branch.branchId ? existingQuery.eq("branch_id", branch.branchId) : existingQuery.is("branch_id", null);
    const { data: existing, error: readError } = await existingQuery;
    if (readError) return { success: false, error: readError.message };
    const idByLine = new Map(((existing ?? []) as { id: string; line: string }[]).map((r) => [r.line, r.id]));

    for (const line of OPENING_LINES) {
      const amount = v.amounts[line] ?? 0;
      const row = {
        store_id: storeId,
        branch_id: branch.branchId,
        line,
        amount,
        as_of_date: v.asOfDate,
        created_by: auth.actor.userId,
        updated_at: new Date().toISOString(),
      };
      const id = idByLine.get(line);
      const { error } = id
        ? await supabaseAdmin.from("money_opening_balances").update(row).eq("id", id).eq("store_id", storeId)
        : await supabaseAdmin.from("money_opening_balances").insert(row);
      if (error) return { success: false, error: error.message };
    }

    await logActivity(auth.actor, {
      action: "money.opening_balance",
      branchId: branch.branchId,
      entityType: "money_opening_balance",
      entityId: null,
      summary: `Opening balances saved as of ${v.asOfDate}`,
      details: { as_of_date: v.asOfDate, amounts: v.amounts },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the opening balances" };
  }
}

/** The interest part of a loan repayment, saved as an expense named "Loan interest" paid from shop money. */
async function saveLoanInterestExpense(
  storeId: string,
  input: { amount: number; date: string; method: string; branchId: string | null; note: string | null },
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
    paid_from: "shop",
    notes: input.note,
    ...(input.branchId ? { branch_id: input.branchId } : {}),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Records money in (owner investment, loan received, other income) or money
 * out (loan repayment, equipment purchase). Expenses, supplier payments,
 * refunds, withdrawals and transfers keep their own screens.
 * @returns success, or why it failed
 */
export async function addMoneyEntry(storeId: string, input: MoneyEntryInput): Promise<MoneyBookResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = entrySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;
    if ((v.kind === "in") !== IN_TYPES.has(v.entryType)) {
      return { success: false, error: "That type does not match money in or money out" };
    }

    const branch = await resolveBranch(storeId, v.branchId);
    if (!branch.ok) return { success: false, error: branch.error };

    // Only owner money and loans have a person behind them, and they must be on this store's list.
    let partnerId: string | null = null;
    if (v.partnerId && PARTNER_TYPES.has(v.entryType)) {
      const { data: partner } = await supabaseAdmin
        .from("money_partners")
        .select("id")
        .eq("id", v.partnerId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (!partner) return { success: false, error: "That person is not on the list" };
      partnerId = partner.id;
    }

    // A loan repayment can say how much of it is interest: that part is a cost (an expense), and
    // only the rest lowers the loan.
    const interest = v.entryType === "loan_repayment" ? Math.round((v.interestAmount ?? 0) * 100) / 100 : 0;
    if (interest > v.amount + 0.005) return { success: false, error: "The interest cannot be more than the amount paid" };
    const principal = Math.round((v.amount - interest) * 100) / 100;

    let entryId: string | null = null;
    if (principal > 0.005) {
      const { data, error } = await supabaseAdmin
        .from("money_entries")
        .insert({
          store_id: storeId,
          branch_id: branch.branchId,
          kind: v.kind,
          entry_type: v.entryType,
          amount: principal,
          payment_method: v.paymentMethod,
          entry_date: v.date,
          note: v.note || null,
          created_by: auth.actor.userId,
          // Only sent when set, so a database without the column keeps working.
          ...(partnerId ? { partner_id: partnerId } : {}),
        })
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      entryId = data?.id ?? null;
    }

    if (interest > 0.005) {
      const expense = await saveLoanInterestExpense(storeId, {
        amount: interest,
        date: v.date,
        method: v.paymentMethod,
        branchId: branch.branchId,
        note: v.note || null,
      });
      if (!expense.ok) {
        // Do not leave half of the repayment saved.
        if (entryId) await supabaseAdmin.from("money_entries").delete().eq("id", entryId).eq("store_id", storeId);
        return { success: false, error: expense.error };
      }
    }

    await logActivity(auth.actor, {
      action: "money.entry",
      branchId: branch.branchId,
      entityType: "money_entry",
      entityId: entryId,
      summary: `${v.kind === "in" ? "Money in" : "Money out"} ৳${v.amount} (${v.entryType})${interest > 0.005 ? `, of which interest ৳${interest}` : ""}`,
      details: { entry_date: v.date, payment_method: v.paymentMethod, note: v.note ?? null, interest },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the entry" };
  }
}

/**
 * Removes an entry typed by mistake.
 * @returns success, or why it failed
 */
export async function deleteMoneyEntry(storeId: string, entryId: string): Promise<MoneyBookResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("money_entries")
      .select("kind, entry_type, amount, entry_date")
      .eq("id", entryId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Entry not found" };

    const { error } = await supabaseAdmin.from("money_entries").delete().eq("id", entryId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.entry_delete",
      entityType: "money_entry",
      entityId: entryId,
      summary: `Deleted ${existing.kind === "in" ? "money in" : "money out"} of ৳${existing.amount} (${existing.entry_type})`,
      details: existing,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete the entry" };
  }
}

/**
 * Saves the daily cash count. When the cash in the drawer differs from what the
 * books expected, the difference is saved as "cash over" or "cash short" so the
 * books agree with the drawer again. A count that matches saves nothing.
 * @returns success, or why it failed
 */
export async function recordCashCount(storeId: string, input: CashCountInput): Promise<MoneyBookResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = countSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the amounts" };
    const v = parsed.data;

    const difference = Math.round((v.counted - v.expected) * 100) / 100;
    if (Math.abs(difference) < 0.005) return { success: true };

    const branch = await resolveBranch(storeId, v.branchId);
    if (!branch.ok) return { success: false, error: branch.error };

    const { data, error } = await supabaseAdmin
      .from("money_entries")
      .insert({
        store_id: storeId,
        branch_id: branch.branchId,
        kind: difference > 0 ? "in" : "out",
        entry_type: difference > 0 ? "cash_over" : "cash_short",
        amount: Math.abs(difference),
        payment_method: "cash",
        entry_date: v.date,
        note: v.note || null,
        meta: { counted: v.counted, expected: v.expected },
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.cash_count",
      branchId: branch.branchId,
      entityType: "money_entry",
      entityId: data?.id ?? null,
      summary: `Cash count: counted ৳${v.counted}, books ৳${v.expected}, ${difference > 0 ? "over" : "short"} ৳${Math.abs(difference)}`,
      details: { entry_date: v.date, counted: v.counted, expected: v.expected },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the cash count" };
  }
}
