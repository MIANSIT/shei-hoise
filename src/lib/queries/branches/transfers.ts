"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import {
  BRANCH_SCOPE_ERROR,
  canUseBranch,
  getAuthorizedStoreId,
  logActivity,
  type Actor,
} from "@/lib/permissions/server";
import {
  MULTI_BRANCH_FEATURE,
  type BranchActionResult,
  type BranchStockOption,
  type TransferItem,
  type TransferListItem,
  type TransferStatus,
} from "./types";

/**
 * Stock transfers between branches: draft → sent (stock leaves the source)
 * → received (stock lands in the target), or cancelled. The stock moves
 * happen in SQL (send/receive/cancel_branch_transfer) under row locks.
 */

type AuthOk = { ok: true; storeId: string; actor: Actor };

async function authorize(permission: string): Promise<AuthOk | { ok: false; error: string }> {
  const auth = await getAuthorizedStoreId(permission);
  if (!auth.ok) return auth;
  const subscription = await getStoreFeatureSubscription(auth.storeId);
  if (!hasFeature(subscription, MULTI_BRANCH_FEATURE)) {
    return { ok: false, error: "Branches aren't included in your plan." };
  }
  return { ok: true, storeId: auth.storeId, actor: auth.actor };
}

interface TransferRow {
  id: string;
  transfer_number: string;
  from_branch_id: string;
  to_branch_id: string;
  status: TransferStatus;
  note: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  from_branch: { name: string } | null;
  to_branch: { name: string } | null;
  branch_stock_transfer_items: {
    id: string;
    product_id: string;
    variant_id: string | null;
    product_name: string | null;
    variant_name: string | null;
    quantity: number;
  }[];
}

const TRANSFER_SELECT = `
  id, transfer_number, from_branch_id, to_branch_id, status, note, created_at, sent_at, received_at,
  from_branch:store_branches!branch_stock_transfers_from_branch_id_fkey (name),
  to_branch:store_branches!branch_stock_transfers_to_branch_id_fkey (name),
  branch_stock_transfer_items (id, product_id, variant_id, product_name, variant_name, quantity)
`;

function toListItem(row: TransferRow, withItems: boolean): TransferListItem {
  const items: TransferItem[] = (row.branch_stock_transfer_items ?? []).map((i) => ({
    id: i.id,
    productId: i.product_id,
    variantId: i.variant_id,
    productName: i.product_name ?? "",
    variantName: i.variant_name,
    quantity: i.quantity,
  }));
  return {
    id: row.id,
    transferNumber: row.transfer_number,
    fromBranchId: row.from_branch_id,
    fromBranchName: row.from_branch?.name ?? "",
    toBranchId: row.to_branch_id,
    toBranchName: row.to_branch?.name ?? "",
    status: row.status,
    note: row.note,
    itemCount: items.length,
    unitCount: items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: row.created_at,
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    ...(withItems ? { items } : {}),
  };
}

export async function getTransfers(filters: { page?: number; pageSize?: number; status?: TransferStatus | null } = {}): Promise<
  { ok: true; rows: TransferListItem[]; total: number } | { ok: false; error: string }
> {
  try {
    const auth = await authorize("transfers.view");
    if (!auth.ok) return auth;

    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    let query = supabaseAdmin
      .from("branch_stock_transfers")
      .select(TRANSFER_SELECT, { count: "exact" })
      .eq("store_id", auth.storeId)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (filters.status) query = query.eq("status", filters.status);

    // Staff limited to some branches only see transfers touching them.
    const { actor } = auth;
    if (actor.kind === "staff" && !actor.allBranches) {
      if (actor.branchIds.length === 0) return { ok: true, rows: [], total: 0 };
      const ids = actor.branchIds.join(",");
      query = query.or(`from_branch_id.in.(${ids}),to_branch_id.in.(${ids})`);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error("getTransfers failed:", error.message);
      return { ok: false, error: "Could not load transfers." };
    }
    return {
      ok: true,
      rows: ((data as unknown as TransferRow[]) ?? []).map((r) => toListItem(r, true)),
      total: count ?? 0,
    };
  } catch (err) {
    console.error("getTransfers failed:", err);
    return { ok: false, error: "Could not load transfers." };
  }
}

/** Products with their stock in one branch, for picking what to transfer. */
export async function getBranchStockOptions(branchId: string, search = ""): Promise<
  { ok: true; options: BranchStockOption[] } | { ok: false; error: string }
> {
  try {
    const auth = await authorize("transfers.view");
    if (!auth.ok) return auth;
    if (!canUseBranch(auth.actor, branchId)) return { ok: false, error: BRANCH_SCOPE_ERROR };

    let query = supabaseAdmin
      .from("branch_inventory")
      .select("product_id, variant_id, quantity_available, products!inner(name, product_type), product_variants(variant_name, is_active)")
      .eq("store_id", auth.storeId)
      .eq("branch_id", branchId)
      .gt("quantity_available", 0)
      .neq("products.product_type", "bundle")
      .limit(200);
    const term = search.trim();
    if (term) query = query.ilike("products.name", `%${term.replace(/[%_]/g, "\\$&")}%`);

    const { data, error } = await query;
    if (error) {
      console.error("getBranchStockOptions failed:", error.message);
      return { ok: false, error: "Could not load stock." };
    }
    type Row = {
      product_id: string;
      variant_id: string | null;
      quantity_available: number;
      products: { name: string } | null;
      product_variants: { variant_name: string | null; is_active: boolean } | null;
    };
    const options = ((data as unknown as Row[]) ?? [])
      .filter((r) => !r.variant_id || r.product_variants?.is_active !== false)
      .map((r) => ({
        productId: r.product_id,
        variantId: r.variant_id,
        productName: r.products?.name ?? "",
        variantName: r.product_variants?.variant_name ?? null,
        available: r.quantity_available,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName));
    return { ok: true, options };
  } catch (err) {
    console.error("getBranchStockOptions failed:", err);
    return { ok: false, error: "Could not load stock." };
  }
}

const createSchema = z.object({
  fromBranchId: z.string().uuid("Choose the branch to send from"),
  toBranchId: z.string().uuid("Choose the branch to send to"),
  note: z.string().trim().max(300).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        quantity: z.number().int().positive("Quantities must be more than 0"),
      }),
    )
    .min(1, "Add at least one product"),
  /** Send straight away instead of saving a draft. */
  sendNow: z.boolean().optional(),
});

export type CreateTransferInput = z.input<typeof createSchema>;

export async function createTransfer(input: CreateTransferInput): Promise<BranchActionResult<{ id: string; transferNumber: string }>> {
  try {
    const auth = await authorize("transfers.add");
    if (!auth.ok) return auth;
    const { storeId, actor } = auth;

    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the transfer" };
    const { fromBranchId, toBranchId, note, items, sendNow } = parsed.data;
    if (fromBranchId === toBranchId) return { ok: false, error: "Choose two different branches." };
    if (!canUseBranch(actor, fromBranchId) && !canUseBranch(actor, toBranchId)) {
      return { ok: false, error: BRANCH_SCOPE_ERROR };
    }
    if (sendNow && (!canUseBranch(actor, fromBranchId) || (actor.kind === "staff" && !actor.permissions.has("transfers.send")))) {
      return { ok: false, error: "Your role can't send transfers from this branch. Save it as a draft instead." };
    }

    const { data: branches } = await supabaseAdmin
      .from("store_branches")
      .select("id, is_active")
      .eq("store_id", storeId)
      .in("id", [fromBranchId, toBranchId]);
    if ((branches ?? []).length !== 2) return { ok: false, error: "Branch not found" };
    if ((branches ?? []).some((b: { is_active: boolean }) => !b.is_active)) {
      return { ok: false, error: "Both branches must be active." };
    }

    // Merge duplicate lines and snapshot names, checking every product is this store's.
    const merged = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
    for (const item of items) {
      const key = `${item.productId}:${item.variantId ?? ""}`;
      const current = merged.get(key);
      merged.set(key, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: (current?.quantity ?? 0) + item.quantity,
      });
    }
    const productIds = Array.from(new Set(Array.from(merged.values()).map((i) => i.productId)));
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, product_variants(id, variant_name)")
      .eq("store_id", storeId)
      .in("id", productIds);
    type P = { id: string; name: string; product_variants: { id: string; variant_name: string | null }[] };
    const byId = new Map(((products as P[]) ?? []).map((p) => [p.id, p]));
    if (byId.size !== productIds.length) return { ok: false, error: "Product not found" };

    const { data: transfer, error } = await supabaseAdmin
      .from("branch_stock_transfers")
      .insert({
        store_id: storeId,
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        note: note || null,
        created_by: actor.userId,
      })
      .select("id, transfer_number")
      .single();
    if (error || !transfer) {
      console.error("createTransfer insert failed:", error?.message);
      return { ok: false, error: "Could not create the transfer. Please try again." };
    }

    const lines = Array.from(merged.values()).map((i) => {
      const product = byId.get(i.productId)!;
      return {
        transfer_id: transfer.id,
        product_id: i.productId,
        variant_id: i.variantId,
        quantity: i.quantity,
        product_name: product.name,
        variant_name: i.variantId
          ? (product.product_variants.find((v) => v.id === i.variantId)?.variant_name ?? null)
          : null,
      };
    });
    const { error: itemsError } = await supabaseAdmin.from("branch_stock_transfer_items").insert(lines);
    if (itemsError) {
      await supabaseAdmin.from("branch_stock_transfers").delete().eq("id", transfer.id);
      console.error("createTransfer items failed:", itemsError.message);
      return { ok: false, error: "Could not create the transfer. Please try again." };
    }

    await logActivity(actor, {
      action: "transfers.add",
      entityType: "transfer",
      entityId: transfer.id,
      summary: `Created transfer ${transfer.transfer_number} (${lines.length} products)`,
    });

    if (sendNow) {
      const sent = await runTransferRpc("send_branch_transfer", transfer.id, auth);
      if (!sent.ok) {
        return { ok: false, error: `${transfer.transfer_number} was saved as a draft but not sent: ${sent.error}` };
      }
      await logActivity(actor, {
        action: "transfers.send",
        entityType: "transfer",
        entityId: transfer.id,
        summary: `Sent transfer ${transfer.transfer_number}`,
      });
    }

    return { ok: true, data: { id: transfer.id, transferNumber: transfer.transfer_number } };
  } catch (err) {
    console.error("createTransfer failed:", err);
    return { ok: false, error: "Could not create the transfer. Please try again." };
  }
}

async function runTransferRpc(
  fn: "send_branch_transfer" | "receive_branch_transfer" | "cancel_branch_transfer",
  transferId: string,
  auth: AuthOk,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.rpc(fn, {
    p_transfer_id: transferId,
    p_caller_store_id: auth.storeId,
    p_user_id: auth.actor.userId,
  });
  if (error) {
    console.error(`${fn} failed:`, error.message);
    // The SQL messages are written for people ("Not enough stock to send …").
    return { ok: false, error: error.message.replace(/^.*?ERROR:\s*/, "") };
  }
  return { ok: true };
}

async function loadTransfer(storeId: string, transferId: string) {
  const { data } = await supabaseAdmin
    .from("branch_stock_transfers")
    .select("id, transfer_number, from_branch_id, to_branch_id, status")
    .eq("id", transferId)
    .eq("store_id", storeId)
    .maybeSingle();
  return data as
    | { id: string; transfer_number: string; from_branch_id: string; to_branch_id: string; status: TransferStatus }
    | null;
}

/** Send a draft: the stock leaves the source branch. */
export async function sendTransfer(transferId: string): Promise<BranchActionResult> {
  const auth = await authorize("transfers.send");
  if (!auth.ok) return auth;
  const transfer = await loadTransfer(auth.storeId, transferId);
  if (!transfer) return { ok: false, error: "Transfer not found" };
  if (!canUseBranch(auth.actor, transfer.from_branch_id)) return { ok: false, error: BRANCH_SCOPE_ERROR };

  const result = await runTransferRpc("send_branch_transfer", transferId, auth);
  if (!result.ok) return result;
  await logActivity(auth.actor, {
    action: "transfers.send",
    entityType: "transfer",
    entityId: transferId,
    summary: `Sent transfer ${transfer.transfer_number}`,
  });
  return { ok: true };
}

/** Receive a sent transfer: the stock lands in the target branch. */
export async function receiveTransfer(transferId: string): Promise<BranchActionResult> {
  const auth = await authorize("transfers.receive");
  if (!auth.ok) return auth;
  const transfer = await loadTransfer(auth.storeId, transferId);
  if (!transfer) return { ok: false, error: "Transfer not found" };
  if (!canUseBranch(auth.actor, transfer.to_branch_id)) return { ok: false, error: BRANCH_SCOPE_ERROR };

  const result = await runTransferRpc("receive_branch_transfer", transferId, auth);
  if (!result.ok) return result;
  await logActivity(auth.actor, {
    action: "transfers.receive",
    entityType: "transfer",
    entityId: transferId,
    summary: `Received transfer ${transfer.transfer_number}`,
  });
  return { ok: true };
}

/** Cancel a draft, or a sent transfer (its stock goes back to the source branch). */
export async function cancelTransfer(transferId: string): Promise<BranchActionResult> {
  const auth = await authorize("transfers.delete");
  if (!auth.ok) return auth;
  const transfer = await loadTransfer(auth.storeId, transferId);
  if (!transfer) return { ok: false, error: "Transfer not found" };
  if (!canUseBranch(auth.actor, transfer.from_branch_id)) return { ok: false, error: BRANCH_SCOPE_ERROR };

  const result = await runTransferRpc("cancel_branch_transfer", transferId, auth);
  if (!result.ok) return result;
  await logActivity(auth.actor, {
    action: "transfers.delete",
    entityType: "transfer",
    entityId: transferId,
    summary: `Cancelled transfer ${transfer.transfer_number}`,
  });
  return { ok: true };
}
