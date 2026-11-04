"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, requireOwner } from "@/lib/permissions/server";
import { balanceSchema, cashSchema, MONEY } from "./monthCloseSchemas";
import type { BalanceOnDateResult, DailyBalance, RecordDailyBalanceInput } from "./balanceHistoryTypes";

/**
 * The balance sheet saved day by day, so a balance for a past day can be looked up. The database keeps
 * no history of stock, dues or bills, so only days that were saved have one. Saving is owner only (the
 * copy carries the cash figures); reading needs the reports permission, and cash is left out for a
 * non-owner.
 */

const recordSchema = z.object({
  branchId: z.string().uuid().nullable(),
  balance: balanceSchema,
  vendorDue: MONEY,
  cash: cashSchema,
});

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Saves the balance as it is now as today's copy (replacing an earlier copy of today).
 * @returns true when saved; false when it was skipped or could not be saved (never an error for the caller)
 */
export async function recordDailyBalance(storeId: string, input: RecordDailyBalanceInput): Promise<boolean> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return false;
    const parsed = recordSchema.safeParse(input);
    if (!parsed.success) return false;
    const v = parsed.data;

    if (v.branchId) {
      const { data: branch } = await supabaseAdmin.from("store_branches").select("id").eq("id", v.branchId).eq("store_id", storeId).maybeSingle();
      if (!branch) return false;
    }

    const today = dhakaToday();
    let existingQuery = supabaseAdmin.from("balance_snapshots").select("id").eq("store_id", storeId).eq("snapshot_date", today);
    existingQuery = v.branchId ? existingQuery.eq("branch_id", v.branchId) : existingQuery.is("branch_id", null);
    const { data: existing, error: readError } = await existingQuery.maybeSingle();
    // The table is not there until the balance history migration is applied: nothing to save into.
    if (readError) return false;

    const snapshot = { balance: v.balance, vendorDue: v.vendorDue, cash: v.cash };
    const savedAt = new Date().toISOString();
    const { error } = existing
      ? await supabaseAdmin.from("balance_snapshots").update({ snapshot, saved_at: savedAt }).eq("id", (existing as { id: string }).id)
      : await supabaseAdmin.from("balance_snapshots").insert({ store_id: storeId, branch_id: v.branchId, snapshot_date: today, snapshot, saved_at: savedAt });
    return !error;
  } catch {
    return false;
  }
}

interface SnapshotRow {
  snapshot_date: string;
  saved_at: string;
  snapshot: { balance: DailyBalance["balance"]; vendorDue: number; cash: DailyBalance["cash"] };
}

/**
 * The balance saved for one day (whole store or one branch), and the nearest saved days either side
 * when that day has none.
 * @returns the saved balance (or null), the nearest days, or why it could not be read
 */
export async function getBalanceOnDate(storeId: string, branchId: string | null, date: string): Promise<BalanceOnDateResult> {
  try {
    const auth = await authorizeForStore(storeId, "reports.view");
    if (!auth.ok) return { success: false, error: auth.error };
    if (!DATE.safeParse(date).success) return { success: false, error: "Choose a valid date" };

    const scoped = () => {
      const q = supabaseAdmin.from("balance_snapshots").select("snapshot_date, saved_at, snapshot").eq("store_id", storeId);
      return branchId ? q.eq("branch_id", branchId) : q.is("branch_id", null);
    };

    const { data: exact, error } = await scoped().eq("snapshot_date", date).maybeSingle();
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") return { success: true, found: null, earlier: null, later: null };
      return { success: false, error: error.message };
    }
    if (exact) {
      const row = exact as unknown as SnapshotRow;
      const isOwner = auth.actor.kind === "owner";
      return {
        success: true,
        found: { date: row.snapshot_date, savedAt: row.saved_at, balance: row.snapshot.balance, vendorDue: row.snapshot.vendorDue, cash: isOwner ? row.snapshot.cash : null },
        earlier: null,
        later: null,
      };
    }

    const [before, after] = await Promise.all([
      scoped().lt("snapshot_date", date).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
      scoped().gt("snapshot_date", date).order("snapshot_date", { ascending: true }).limit(1).maybeSingle(),
    ]);
    return {
      success: true,
      found: null,
      earlier: (before.data as { snapshot_date: string } | null)?.snapshot_date ?? null,
      later: (after.data as { snapshot_date: string } | null)?.snapshot_date ?? null,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load the balance" };
  }
}
