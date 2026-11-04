"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny, BRANCH_SCOPE_ERROR, canUseBranch, logActivity } from "@/lib/permissions/server";
import {
  TRANSFER_METHODS,
  type BranchTransfer,
  type BranchTransferResult,
  type BranchTransferStatus,
  type SendBranchTransferInput,
  type TransferMethod,
} from "./branchMoneyTransferTypes";

/**
 * Money sent from one branch to another, confirmed by the branch that gets it. The sending branch's balance goes
 * down when it is sent; the receiving branch's goes up only when that branch confirms. Until then it is in transit:
 * still the business's money, but in no branch.
 *
 * Whoever may see Money Overview (reports), enter expenses or record COD can use these, limited to the branches
 * they are assigned to: the sender must belong to the sending branch, and only someone from the receiving branch can
 * confirm.
 */

const PERMISSIONS = ["reports.view", "expenses.add", "cod.add"] as const;
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");

const sendSchema = z.object({
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  amount: z.number().positive("Enter an amount above zero").max(1_000_000_000, "Amount is too large"),
  method: z.enum(TRANSFER_METHODS),
  date: DATE,
  note: z.string().trim().max(300, "Note is too long").optional(),
});

const round2 = (v: number): number => Math.round(v * 100) / 100;
const money = (v: number): string => round2(v).toLocaleString("en-BD");

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

interface TransferDbRow {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  amount: number;
  payment_method: string;
  transfer_date: string;
  note: string | null;
  status: string;
  received_date: string | null;
}

const COLUMNS = "id, from_branch_id, to_branch_id, amount, payment_method, transfer_date, note, status, received_date";

const toTransfer = (r: TransferDbRow): BranchTransfer => ({
  id: r.id,
  fromBranchId: r.from_branch_id,
  toBranchId: r.to_branch_id,
  amount: Number(r.amount),
  method: r.payment_method as TransferMethod,
  date: r.transfer_date,
  note: r.note,
  status: r.status as BranchTransferStatus,
  receivedDate: r.received_date,
});

/**
 * The newest transfers the person may see: all of them for the owner, and for staff the ones that leave from or
 * arrive at a branch they are assigned to.
 * @returns the transfers, newest first, or an empty list when not allowed or on failure
 */
export async function listBranchTransfers(storeId: string): Promise<BranchTransfer[]> {
  try {
    const auth = await authorizeForStoreAny(storeId, PERMISSIONS);
    if (!auth.ok) return [];
    const { data, error } = await supabaseAdmin
      .from("branch_money_transfers")
      .select(COLUMNS)
      .eq("store_id", storeId)
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return ((data ?? []) as TransferDbRow[])
      .filter((r) => canUseBranch(auth.actor, r.from_branch_id) || canUseBranch(auth.actor, r.to_branch_id))
      .map(toTransfer);
  } catch (error) {
    console.error("listBranchTransfers failed:", error);
    return [];
  }
}

/**
 * Sends money from one branch to another. It leaves the sending branch now and reaches the other branch when
 * that branch confirms it.
 * @returns success, or why it failed
 */
export async function sendBranchTransfer(storeId: string, input: SendBranchTransferInput): Promise<BranchTransferResult> {
  try {
    const auth = await authorizeForStoreAny(storeId, PERMISSIONS);
    if (!auth.ok) return { success: false, error: auth.error };
    const parsed = sendSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;
    if (v.fromBranchId === v.toBranchId) return { success: false, error: "Choose two different branches" };
    if (v.date > dhakaToday()) return { success: false, error: "The date cannot be in the future" };
    if (!canUseBranch(auth.actor, v.fromBranchId)) return { success: false, error: BRANCH_SCOPE_ERROR };

    // Both ids come from the browser: they must be this store's own branches.
    const { data: branches } = await supabaseAdmin.from("store_branches").select("id, name").eq("store_id", storeId).in("id", [v.fromBranchId, v.toBranchId]);
    const names = new Map(((branches ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));
    if (!names.has(v.fromBranchId) || !names.has(v.toBranchId)) return { success: false, error: "Branch not found" };

    const { data, error } = await supabaseAdmin
      .from("branch_money_transfers")
      .insert({
        store_id: storeId,
        from_branch_id: v.fromBranchId,
        to_branch_id: v.toBranchId,
        amount: round2(v.amount),
        payment_method: v.method,
        transfer_date: v.date,
        note: v.note || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.branch_transfer_send",
      branchId: v.fromBranchId,
      entityType: "branch_money_transfer",
      entityId: data?.id ?? null,
      summary: `Sent ৳${money(v.amount)} (${v.method}) from ${names.get(v.fromBranchId)} to ${names.get(v.toBranchId)}`,
      details: { transfer_date: v.date, to_branch_id: v.toBranchId },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send" };
  }
}

/** Loads one transfer of this store, or null. */
async function loadTransfer(storeId: string, id: string): Promise<TransferDbRow | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { data } = await supabaseAdmin.from("branch_money_transfers").select(COLUMNS).eq("id", id).eq("store_id", storeId).maybeSingle();
  return (data as TransferDbRow | null) ?? null;
}

/**
 * The receiving branch confirms the money arrived. Only someone assigned to the receiving branch can do it; from
 * then the money counts in that branch's balance.
 * @returns success, or why it failed
 */
export async function confirmBranchTransfer(storeId: string, id: string): Promise<BranchTransferResult> {
  try {
    const auth = await authorizeForStoreAny(storeId, PERMISSIONS);
    if (!auth.ok) return { success: false, error: auth.error };
    const row = await loadTransfer(storeId, id);
    if (!row) return { success: false, error: "Transfer not found" };
    if (row.status !== "sent") return { success: false, error: row.status === "received" ? "This money was already confirmed" : "This transfer was cancelled" };
    if (!canUseBranch(auth.actor, row.to_branch_id)) return { success: false, error: "Only the branch that receives the money can confirm it." };

    const { error } = await supabaseAdmin
      .from("branch_money_transfers")
      .update({ status: "received", received_by: auth.actor.userId, received_at: new Date().toISOString(), received_date: dhakaToday() })
      .eq("id", id)
      .eq("store_id", storeId)
      .eq("status", "sent");
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.branch_transfer_receive",
      branchId: row.to_branch_id,
      entityType: "branch_money_transfer",
      entityId: id,
      summary: `Confirmed ৳${money(Number(row.amount))} received (${row.payment_method})`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to confirm" };
  }
}

/**
 * The sending branch takes the money back before the other branch confirmed it. Nothing moves.
 * @returns success, or why it failed
 */
export async function cancelBranchTransfer(storeId: string, id: string): Promise<BranchTransferResult> {
  try {
    const auth = await authorizeForStoreAny(storeId, PERMISSIONS);
    if (!auth.ok) return { success: false, error: auth.error };
    const row = await loadTransfer(storeId, id);
    if (!row) return { success: false, error: "Transfer not found" };
    if (row.status !== "sent") return { success: false, error: row.status === "received" ? "The other branch already confirmed this money" : "This transfer was already cancelled" };
    if (!canUseBranch(auth.actor, row.from_branch_id)) return { success: false, error: BRANCH_SCOPE_ERROR };

    const { error } = await supabaseAdmin
      .from("branch_money_transfers")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("store_id", storeId)
      .eq("status", "sent");
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.branch_transfer_cancel",
      branchId: row.from_branch_id,
      entityType: "branch_money_transfer",
      entityId: id,
      summary: `Cancelled a transfer of ৳${money(Number(row.amount))}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to cancel" };
  }
}
