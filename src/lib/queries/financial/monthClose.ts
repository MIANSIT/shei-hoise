"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity, requireOwner } from "@/lib/permissions/server";
import { balanceSchema, cashSchema, COUNT, MONEY } from "./monthCloseSchemas";
import type { CloseMonthInput, MonthClose, MonthCloseResult, MonthClosesResult, MonthCloseSnapshot } from "./monthCloseTypes";

/**
 * Closing a month saves the Profit & Loss and the Balance Sheet as they are, so the
 * business can be looked at later as it stood. It also locks the month: database
 * triggers (migration 20261121) refuse money records dated in it until it is reopened. Closing and reopening are owner only
 * (they carry the cash figures); reading needs the reports permission, and cash is
 * left out of what a non-owner receives.
 */

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid month");

const snapshotSchema = z.object({
  pl: z.object({
    netRevenue: MONEY,
    collected: MONEY,
    uncollected: MONEY,
    ordersCount: COUNT,
    cogs: MONEY,
    grossProfit: MONEY,
    missingCostLines: COUNT,
    missingCostSales: MONEY,
    operatingExpenses: MONEY,
    netDeliveryCost: MONEY,
    otherIncome: MONEY.optional(),
    netProfit: MONEY,
  }),
  vendorProfit: MONEY,
  balance: balanceSchema,
  vendorDue: MONEY,
  cash: cashSchema,
});

const closeSchema = z.object({
  branchId: z.string().uuid().nullable(),
  periodStart: DATE,
  periodEnd: DATE,
  snapshot: snapshotSchema,
});

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** True when the two dates are the first and last day of the same calendar month. */
function isWholeMonth(start: string, end: string): boolean {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  const lastDay = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0));
  return s.getUTCDate() === 1 && e.getTime() === lastDay.getTime();
}

interface CloseRow {
  id: string;
  branch_id: string | null;
  period_start: string;
  period_end: string;
  closed_at: string;
  snapshot: MonthCloseSnapshot;
}

/**
 * The closed months for the whole store or one branch, newest first.
 * @returns the closed months, or why they could not be read
 */
export async function getMonthCloses(storeId: string, branchId: string | null): Promise<MonthClosesResult> {
  try {
    const auth = await authorizeForStore(storeId, "reports.view");
    if (!auth.ok) return { success: false, error: auth.error };

    let query = supabaseAdmin
      .from("period_closes")
      .select("id, branch_id, period_start, period_end, closed_at, snapshot")
      .eq("store_id", storeId);
    query = branchId ? query.eq("branch_id", branchId) : query.is("branch_id", null);
    const { data, error } = await query.order("period_end", { ascending: false }).limit(60);
    if (error) {
      // The table is not there until the month close migration is applied: no closed months, not an error.
      if (error.code === "42P01" || error.code === "PGRST205") return { success: true, closes: [] };
      return { success: false, error: error.message };
    }

    const isOwner = auth.actor.kind === "owner";
    const closes: MonthClose[] = ((data ?? []) as unknown as CloseRow[]).map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      closedAt: row.closed_at,
      snapshot: isOwner ? row.snapshot : { ...row.snapshot, cash: null },
    }));
    return { success: true, closes };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load closed months" };
  }
}

/**
 * Saves a month as closed. The month must be a whole calendar month that has ended.
 * @returns success, or why it failed
 */
export async function closeMonth(storeId: string, input: CloseMonthInput): Promise<MonthCloseResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = closeSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the figures" };
    const v = parsed.data;

    if (!isWholeMonth(v.periodStart, v.periodEnd)) return { success: false, error: "Choose a whole month" };
    if (v.periodEnd >= dhakaToday()) return { success: false, error: "That month has not ended yet" };

    if (v.branchId) {
      const { data: branch } = await supabaseAdmin
        .from("store_branches")
        .select("id")
        .eq("id", v.branchId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (!branch) return { success: false, error: "Branch not found" };
    }

    const { error } = await supabaseAdmin.from("period_closes").insert({
      store_id: storeId,
      branch_id: v.branchId,
      period_start: v.periodStart,
      period_end: v.periodEnd,
      snapshot: v.snapshot,
      closed_by: auth.actor.userId,
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "This month is already closed. Reopen it first to close it again." };
      if (error.code === "42P01" || error.code === "PGRST205") return { success: false, error: "Month close is not set up in the database yet." };
      return { success: false, error: error.message };
    }

    await logActivity(auth.actor, {
      action: "money.month_close",
      branchId: v.branchId,
      entityType: "period_close",
      entityId: null,
      summary: `Closed the month ${v.periodStart} to ${v.periodEnd}`,
      details: { period_start: v.periodStart, period_end: v.periodEnd },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to close the month" };
  }
}

/**
 * Reopens a closed month: its saved copy is deleted, and it can be closed again.
 * @returns success, or why it failed
 */
export async function reopenMonth(storeId: string, closeId: string): Promise<MonthCloseResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const { data, error } = await supabaseAdmin
      .from("period_closes")
      .delete()
      .eq("id", closeId)
      .eq("store_id", storeId)
      .select("period_start, period_end, branch_id")
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Closed month not found" };

    await logActivity(auth.actor, {
      action: "money.month_reopen",
      branchId: data.branch_id,
      entityType: "period_close",
      entityId: closeId,
      summary: `Reopened the month ${data.period_start} to ${data.period_end}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reopen the month" };
  }
}
