"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { canUseBranch, getAuthorizedStoreId } from "@/lib/permissions/server";

/**
 * Stamps orders as "invoice printed" (now). Called after an invoice or
 * receipt is printed, downloaded, or included in a bulk invoice PDF, so the
 * order list can filter to the ones not printed yet. Never throws — a failed
 * stamp mustn't spoil a print that already happened.
 * @returns how many orders were stamped
 */
export async function markInvoicesPrinted(orderIds: string[]): Promise<{ ok: boolean; count: number }> {
  try {
    const ids = [...new Set(orderIds.filter(Boolean))].slice(0, 500);
    if (ids.length === 0) return { ok: true, count: 0 };

    // Anyone who can open the order list can print its invoices.
    const auth = await getAuthorizedStoreId("orders.view");
    if (!auth.ok) return { ok: false, count: 0 };

    // Staff limited to some branches only stamp their branches' orders.
    let allowedIds = ids;
    if (auth.actor.kind === "staff" && !auth.actor.allBranches) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("store_id", auth.storeId)
        .in("id", ids);
      allowedIds = ((data ?? []) as { id: string; branch_id?: string | null }[])
        .filter((o) => !o.branch_id || canUseBranch(auth.actor, o.branch_id))
        .map((o) => o.id);
    }
    if (allowedIds.length === 0) return { ok: true, count: 0 };

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ invoice_printed_at: new Date().toISOString() })
      .eq("store_id", auth.storeId)
      .in("id", allowedIds);
    if (error) {
      // e.g. the column doesn't exist yet (migration not applied).
      console.warn("markInvoicesPrinted failed:", error.message);
      return { ok: false, count: 0 };
    }
    return { ok: true, count: allowedIds.length };
  } catch (err) {
    console.error("markInvoicesPrinted failed:", err);
    return { ok: false, count: 0 };
  }
}
