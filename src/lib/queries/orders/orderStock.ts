import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-only order stock helpers (imported by "use server" order actions —
 * deliberately not a server action module itself, so none of this is
 * callable from the browser).
 *
 * Every order stock change goes through the order_stock_move() database
 * function: one row-locked update on the order's branch (stores with
 * branches) or on product_inventory (stores without). It replaces the
 * read-then-write updates the order code used to do, which could lose a
 * change when two orders touched the same product at once.
 */

export interface StockLine {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

/**
 * - reserve:  order placed / reopened — available → reserved
 * - release:  cancelled or returned before delivery — reserved → available
 * - finalize: delivered — the reservation is cleared, the stock has left
 * - restock:  returned after delivery — straight back to available
 */
export type OrderStockOp = "reserve" | "release" | "finalize" | "restock";

const SQL_OP: Record<OrderStockOp, { op: "reserve" | "take" | "finalize"; sign: 1 | -1 }> = {
  reserve: { op: "reserve", sign: 1 },
  release: { op: "reserve", sign: -1 },
  finalize: { op: "finalize", sign: 1 },
  restock: { op: "take", sign: -1 },
};

async function callStockMove(
  orderId: string,
  line: StockLine,
  op: "reserve" | "take" | "finalize",
  qty: number,
): Promise<string | null> {
  if (!qty) return null;
  const { error } = await supabaseAdmin.rpc("order_stock_move", {
    p_order_id: orderId,
    p_product_id: line.product_id,
    p_variant_id: line.variant_id ?? null,
    p_op: op,
    p_qty: qty,
  });
  if (error && isMissingFunction(error)) return legacyStockMove(line, op, qty);
  return error ? error.message : null;
}

// PGRST202: the database function doesn't exist (migration not applied yet).
function isMissingFunction(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST202" || /could not find the function/i.test(error.message ?? "");
}

/**
 * The pre-branches behaviour, used only until 20261003000000 is applied, so
 * deploying the code first never stops orders from reserving stock.
 */
async function legacyStockMove(
  line: StockLine,
  op: "reserve" | "take" | "finalize",
  qty: number,
): Promise<string | null> {
  const base = supabaseAdmin.from("product_inventory").select("id, quantity_available, quantity_reserved");
  const { data: row } = await (line.variant_id
    ? base.eq("variant_id", line.variant_id)
    : base.eq("product_id", line.product_id).is("variant_id", null)
  ).maybeSingle();
  if (!row) return null;
  const available = row.quantity_available ?? 0;
  const reserved = row.quantity_reserved ?? 0;
  const next =
    op === "reserve"
      ? { quantity_available: Math.max(0, available - qty), quantity_reserved: Math.max(0, reserved + qty) }
      : op === "take"
        ? { quantity_available: Math.max(0, available - qty) }
        : { quantity_reserved: Math.max(0, reserved - qty) };
  const { error } = await supabaseAdmin
    .from("product_inventory")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  return error ? error.message : null;
}

/** Applies one stock operation to every line of an order. */
export async function moveOrderStock(
  orderId: string,
  lines: StockLine[],
  op: OrderStockOp,
): Promise<{ success: boolean; error?: string }> {
  const { op: sqlOp, sign } = SQL_OP[op];
  const errors = (
    await Promise.all(lines.map((line) => callStockMove(orderId, line, sqlOp, sign * (line.quantity || 0))))
  ).filter((e): e is string => !!e);
  if (errors.length > 0) {
    console.error(`moveOrderStock(${op}) failed for ${errors.length} line(s):`, errors);
    return { success: false, error: errors.join("; ") };
  }
  return { success: true };
}

/**
 * A line's quantity changed on an existing order. "reserved": the order is
 * still holding stock (pending → shipped); "available": it was delivered, so
 * the change comes straight out of (or back into) available stock.
 */
export async function adjustOrderLineStock(
  orderId: string,
  line: StockLine,
  quantityDiff: number,
  mode: "reserved" | "available",
): Promise<void> {
  const error = await callStockMove(orderId, line, mode === "reserved" ? "reserve" : "take", quantityDiff);
  if (error) console.error("adjustOrderLineStock failed:", error);
}

/* ----------------------------------------------------------------------- */
/* Picking an order's branch                                                */
/* ----------------------------------------------------------------------- */

export interface BranchSuggestion {
  branch_id: string;
  branch_name: string;
  priority: number;
  can_fulfil: boolean;
  covered_lines: number;
  total_lines: number;
  missing: { product_id: string; variant_id: string | null; need: number; have: number }[];
}

/** Active branches ranked for these lines: those with everything first (by priority). */
export async function suggestBranches(storeId: string, lines: StockLine[]): Promise<BranchSuggestion[]> {
  const { data, error } = await supabaseAdmin.rpc("suggest_order_branches", {
    p_store_id: storeId,
    p_items: lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id ?? null, quantity: l.quantity })),
  });
  if (error) {
    // Before the phase-2 migration is applied this function doesn't exist;
    // orders then simply get no branch, exactly as before.
    console.error("suggest_order_branches failed:", error.message);
    return [];
  }
  return (data as BranchSuggestion[]) ?? [];
}

export interface BranchPlacement {
  branchId: string | null;
  /** No branch had every item. */
  needsTransfer: boolean;
  /** false = waiting in the Unassigned tab for someone to confirm. */
  confirmed: boolean;
  error?: string;
}

const NO_BRANCH: BranchPlacement = { branchId: null, needsTransfer: false, confirmed: true };

/**
 * Chooses the branch a new order belongs to.
 * - `explicitBranchId` (dashboard / Quick Sale with a branch selected): that
 *   branch, which must be active and have every item.
 * - Otherwise: the first branch by priority that has every item. In the
 *   store's "confirm" mode, or when several branches could do it, a person
 *   confirms it from the Unassigned tab. If no branch has everything, the
 *   one with the most is used and the order is flagged "needs transfer".
 * Stores without branches get no branch.
 */
export async function pickOrderBranch(
  storeId: string,
  lines: StockLine[],
  explicitBranchId?: string | null,
): Promise<BranchPlacement> {
  const { data: branches, error } = await supabaseAdmin
    .from("store_branches")
    .select("id, name, is_active")
    .eq("store_id", storeId);
  if (error || !branches || branches.length === 0) return NO_BRANCH;

  if (explicitBranchId) {
    const branch = branches.find((b: { id: string }) => b.id === explicitBranchId) as
      | { id: string; name: string; is_active: boolean }
      | undefined;
    if (!branch || !branch.is_active) {
      return { ...NO_BRANCH, error: "Choose an active branch for this order." };
    }
    const suggestion = (await suggestBranches(storeId, lines)).find((s) => s.branch_id === branch.id);
    if (suggestion && !suggestion.can_fulfil) {
      return { ...NO_BRANCH, error: `Not enough stock in ${branch.name} for this order. Choose another branch or transfer stock first.` };
    }
    return { branchId: branch.id, needsTransfer: false, confirmed: true };
  }

  const suggestions = await suggestBranches(storeId, lines);
  if (suggestions.length === 0) return NO_BRANCH;

  const top = suggestions[0];
  if (!top.can_fulfil) {
    return { branchId: top.branch_id, needsTransfer: true, confirmed: false };
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("branch_assignment_mode")
    .eq("id", storeId)
    .maybeSingle();
  const confirmMode = (store as { branch_assignment_mode?: string } | null)?.branch_assignment_mode === "confirm";
  const candidates = suggestions.filter((s) => s.can_fulfil).length;
  return { branchId: top.branch_id, needsTransfer: false, confirmed: !confirmMode || candidates === 1 };
}

/** Order columns for a placement — only set when the order actually gets a branch. */
export function branchColumns(placement: BranchPlacement): Record<string, unknown> {
  if (!placement.branchId) return {};
  return {
    branch_id: placement.branchId,
    needs_transfer: placement.needsTransfer,
    branch_confirmed: placement.confirmed,
  };
}
