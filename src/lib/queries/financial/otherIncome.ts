"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny } from "@/lib/permissions/server";
import type { OtherIncomeResult } from "./moneyBookTypes";

/**
 * Income that is not a sale, taken from the Money Book, for the Profit & Loss: "other income"
 * entries and cash counted over add to profit, cash counted short takes from it. Read with the
 * server key and returned only as totals, so people who may see the Profit & Loss (but not the
 * owner-only Money Book) see the same net profit as the owner.
 * @returns the net total and the net per day (YYYY-MM-DD); zero when none, not allowed, or the table is missing
 */
export async function getOtherIncomeForPeriod(
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId: string | null,
): Promise<OtherIncomeResult> {
  const empty: OtherIncomeResult = { total: 0, byDay: {} };
  try {
    const auth = await authorizeForStoreAny(storeId, ["dashboard.view", "reports.view"]);
    if (!auth.ok) return empty;

    let query = supabaseAdmin
      .from("money_entries")
      .select("entry_type, amount, entry_date")
      .eq("store_id", storeId)
      .in("entry_type", ["other_income", "cash_over", "cash_short"])
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate);
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query.limit(10000);
    if (error) return empty;

    const byDay: Record<string, number> = {};
    let total = 0;
    for (const row of (data ?? []) as { entry_type: string; amount: number; entry_date: string }[]) {
      const signed = (row.entry_type === "cash_short" ? -1 : 1) * (Number(row.amount) || 0);
      const day = String(row.entry_date).slice(0, 10);
      byDay[day] = Math.round(((byDay[day] ?? 0) + signed) * 100) / 100;
      total += signed;
    }
    return { total: Math.round(total * 100) / 100, byDay };
  } catch {
    return empty;
  }
}
