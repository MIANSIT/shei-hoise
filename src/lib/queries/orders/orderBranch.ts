"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BRANCH_SCOPE_ERROR,
  canUseBranch,
  getAuthorizedStoreId,
  getOwnerStoreId,
  logActivity,
} from "@/lib/permissions/server";
import { suggestBranches } from "./orderStock";

/**
 * An order's branch: which branches could fulfil it, moving it, confirming
 * an automatically picked branch, and the store's assignment mode.
 */

export interface OrderBranchOption {
  branchId: string;
  name: string;
  priority: number;
  /** Holds this order's stock right now. */
  isCurrent: boolean;
  /** Has every item (for the current branch: it already holds them). */
  canFulfil: boolean;
  /** "Cat litter ×1" lines it's short of. */
  missing: string[];
}

export type OrderBranchInfo =
  | {
      ok: true;
      branchId: string | null;
      needsTransfer: boolean;
      confirmed: boolean;
      /** Only pending/confirmed orders can move. */
      canMove: boolean;
      options: OrderBranchOption[];
    }
  | { ok: false; error: string };

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  branch_id: string | null;
  needs_transfer: boolean | null;
  branch_confirmed: boolean | null;
}

async function loadOrder(storeId: string, orderId: string): Promise<OrderRow | null> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, status, branch_id, needs_transfer, branch_confirmed")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();
  return (data as OrderRow | null) ?? null;
}

/** Branch options for one order, best first, with what each is missing. */
export async function getOrderBranchOptions(orderId: string): Promise<OrderBranchInfo> {
  try {
    const auth = await getAuthorizedStoreId("orders.view");
    if (!auth.ok) return auth;
    const order = await loadOrder(auth.storeId, orderId);
    if (!order) return { ok: false, error: "Order not found" };

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id, variant_id, quantity, product_name, variant_details, products(product_type)")
      .eq("order_id", orderId);
    type Item = {
      product_id: string;
      variant_id: string | null;
      quantity: number;
      product_name: string | null;
      products: { product_type: string } | null;
    };
    const lines = ((items as unknown as Item[]) ?? []).filter((i) => i.products?.product_type !== "bundle");
    const nameOf = new Map(lines.map((l) => [`${l.product_id}:${l.variant_id ?? ""}`, l.product_name ?? ""]));

    const suggestions = await suggestBranches(auth.storeId, lines);
    const options: OrderBranchOption[] = suggestions.map((s) => {
      const isCurrent = s.branch_id === order.branch_id;
      return {
        branchId: s.branch_id,
        name: s.branch_name,
        priority: s.priority,
        isCurrent,
        // The order's own reservation already left the current branch's
        // "available" count, so it would look short of its own items.
        canFulfil: isCurrent || s.can_fulfil,
        missing: isCurrent
          ? []
          : s.missing.map((m) => `${nameOf.get(`${m.product_id}:${m.variant_id ?? ""}`) || "Item"} ×${m.need - m.have}`),
      };
    });
    options.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || Number(b.canFulfil) - Number(a.canFulfil) || a.priority - b.priority);

    return {
      ok: true,
      branchId: order.branch_id,
      needsTransfer: !!order.needs_transfer,
      confirmed: order.branch_confirmed !== false,
      canMove: order.status === "pending" || order.status === "confirmed",
      options,
    };
  } catch (err) {
    console.error("getOrderBranchOptions failed:", err);
    return { ok: false, error: "Could not load branches for this order." };
  }
}

/**
 * Moves an order (and the stock it holds) to another branch, or confirms
 * the current one when branchId is the order's own branch.
 */
export async function moveOrderToBranch(
  orderId: string,
  branchId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const auth = await getAuthorizedStoreId("orders.move_branch");
    if (!auth.ok) return auth;
    const order = await loadOrder(auth.storeId, orderId);
    if (!order) return { ok: false, error: "Order not found" };
    if (!canUseBranch(auth.actor, branchId) || (order.branch_id && !canUseBranch(auth.actor, order.branch_id))) {
      return { ok: false, error: BRANCH_SCOPE_ERROR };
    }

    const { error } = await supabaseAdmin.rpc("move_order_to_branch", {
      p_order_id: orderId,
      p_branch_id: branchId,
      p_caller_store_id: auth.storeId,
    });
    if (error) {
      console.error("move_order_to_branch failed:", error.message);
      return { ok: false, error: error.message.replace(/^.*?ERROR:\s*/, "") };
    }

    const { data: branches } = await supabaseAdmin
      .from("store_branches")
      .select("id, name")
      .in("id", [branchId, order.branch_id].filter((id): id is string => !!id));
    const name = (id: string | null) =>
      (branches as { id: string; name: string }[] | null)?.find((b) => b.id === id)?.name ?? "—";
    const moved = order.branch_id !== branchId;
    await logActivity(auth.actor, {
      action: "orders.move_branch",
      entityType: "order",
      entityId: orderId,
      branchId,
      summary: moved
        ? `#${order.order_number}: ${name(order.branch_id)} → ${name(branchId)}`
        : `#${order.order_number}: confirmed ${name(branchId)}`,
    });
    return { ok: true };
  } catch (err) {
    console.error("moveOrderToBranch failed:", err);
    return { ok: false, error: "Could not move the order. Please try again." };
  }
}

export type BranchAssignmentMode = "auto" | "confirm";

/** Owner-only: whether online orders take the top suggested branch or wait for confirmation. */
export async function setBranchAssignmentMode(
  mode: BranchAssignmentMode,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getOwnerStoreId();
  if (!auth.ok) return auth;
  if (mode !== "auto" && mode !== "confirm") return { ok: false, error: "Invalid setting" };
  const { error } = await supabaseAdmin
    .from("stores")
    .update({ branch_assignment_mode: mode })
    .eq("id", auth.storeId);
  if (error) return { ok: false, error: "Could not save the setting. Please try again." };
  await logActivity(auth.actor, {
    action: "branch.update",
    entityType: "store",
    summary: `Order assignment: ${mode === "auto" ? "automatic" : "confirm each order"}`,
  });
  return { ok: true };
}

export async function getBranchAssignmentMode(): Promise<BranchAssignmentMode> {
  const auth = await getAuthorizedStoreId("orders.view");
  if (!auth.ok) return "auto";
  const { data } = await supabaseAdmin
    .from("stores")
    .select("branch_assignment_mode")
    .eq("id", auth.storeId)
    .maybeSingle();
  return (data as { branch_assignment_mode?: string } | null)?.branch_assignment_mode === "confirm" ? "confirm" : "auto";
}
