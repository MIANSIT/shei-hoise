"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { checkLimit, hasFeature } from "@/lib/utils/planFeatures";
import { getActor, logActivity, requireOwner } from "@/lib/permissions/server";
import {
  MAX_BRANCHES_LIMIT,
  MULTI_BRANCH_FEATURE,
  type BranchActionResult,
  type BranchItem,
  type BranchSetup,
} from "./types";

/**
 * Branches (multi_branch plan feature). Managing them is owner-only; reading
 * the list is open to staff, limited to the branches they're assigned to.
 */

interface BranchRow {
  id: string;
  name: string;
  code: string | null;
  priority: number;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

async function branchFeatureEnabled(storeId: string) {
  const subscription = await getStoreFeatureSubscription(storeId);
  return { subscription, enabled: hasFeature(subscription, MULTI_BRANCH_FEATURE) };
}

async function loadBranches(storeId: string): Promise<BranchRow[]> {
  const { data } = await supabaseAdmin
    .from("store_branches")
    .select("id, name, code, priority, address, phone, is_active")
    .eq("store_id", storeId)
    .order("priority", { ascending: true });
  return (data as BranchRow[]) ?? [];
}

/** Units in stock / reserved per branch, summed over every product. */
async function loadBranchTotals(storeId: string): Promise<Map<string, { available: number; reserved: number }>> {
  const totals = new Map<string, { available: number; reserved: number }>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data } = await supabaseAdmin
      .from("branch_inventory")
      .select("branch_id, quantity_available, quantity_reserved")
      .eq("store_id", storeId)
      .range(from, from + pageSize - 1);
    const rows = (data as { branch_id: string; quantity_available: number; quantity_reserved: number }[]) ?? [];
    for (const row of rows) {
      const t = totals.get(row.branch_id) ?? { available: 0, reserved: 0 };
      t.available += row.quantity_available ?? 0;
      t.reserved += row.quantity_reserved ?? 0;
      totals.set(row.branch_id, t);
    }
    if (rows.length < pageSize) break;
  }
  return totals;
}

/** Branch list for the switcher, stock page, transfers and the Branches page. */
export async function getBranchSetup(): Promise<BranchSetup> {
  try {
    const result = await getActor();
    if (!result.ok) return result;
    const { actor } = result;

    const { subscription, enabled } = await branchFeatureEnabled(actor.storeId);
    const rows = await loadBranches(actor.storeId);
    const isOwner = actor.kind === "owner";
    const canSeeAllBranches = isOwner || actor.allBranches;
    const visible = canSeeAllBranches ? rows : rows.filter((b) => actor.branchIds.includes(b.id));
    const totals = isOwner ? await loadBranchTotals(actor.storeId) : new Map();

    const branches: BranchItem[] = visible.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      priority: b.priority,
      address: b.address,
      phone: b.phone,
      isActive: b.is_active,
      unitsInStock: totals.get(b.id)?.available ?? 0,
      unitsReserved: totals.get(b.id)?.reserved ?? 0,
    }));

    return {
      ok: true,
      featureEnabled: enabled,
      branchesOn: rows.length > 0,
      isOwner,
      maxBranches: checkLimit(subscription, MAX_BRANCHES_LIMIT, rows.length).limit,
      branches,
      canSeeAllBranches,
    };
  } catch (err) {
    console.error("getBranchSetup failed:", err);
    return { ok: false, error: "Could not load branches. Please refresh." };
  }
}

const branchSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, "Enter a branch name").max(60),
  code: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
});

export type SaveBranchInput = z.input<typeof branchSchema>;

async function ownerWithBranchFeature() {
  const auth = await requireOwner();
  if (!auth.ok) return auth;
  const { subscription, enabled } = await branchFeatureEnabled(auth.actor.storeId);
  if (!enabled) return { ok: false as const, error: "Branches aren't included in your plan." };
  return { ok: true as const, actor: auth.actor, subscription };
}

/**
 * Turns branches on: creates the first branch (priority 1) and moves all
 * current stock into it, so customers see no change.
 */
export async function enableBranches(input: { name: string; code?: string | null }): Promise<BranchActionResult> {
  try {
    const auth = await ownerWithBranchFeature();
    if (!auth.ok) return auth;
    const name = input.name?.trim();
    if (!name) return { ok: false, error: "Enter a branch name" };

    const { error } = await supabaseAdmin.rpc("enable_store_branches", {
      p_store_id: auth.actor.storeId,
      p_name: name.slice(0, 60),
      p_code: input.code?.trim() || null,
    });
    if (error) {
      console.error("enable_store_branches failed:", error.message);
      return {
        ok: false,
        error: /already/i.test(error.message) ? "Branches are already on." : "Could not turn on branches. Please try again.",
      };
    }

    await logActivity(auth.actor, {
      action: "branch.enable",
      entityType: "branch",
      summary: `Turned on branches; first branch "${name}"`,
    });
    return { ok: true };
  } catch (err) {
    console.error("enableBranches failed:", err);
    return { ok: false, error: "Could not turn on branches. Please try again." };
  }
}

export async function saveBranch(input: SaveBranchInput): Promise<BranchActionResult<{ id: string }>> {
  try {
    const auth = await ownerWithBranchFeature();
    if (!auth.ok) return auth;
    const { storeId } = auth.actor;

    const parsed = branchSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
    const { id, name, code, address, phone } = parsed.data;

    const existing = await loadBranches(storeId);
    if (existing.length === 0) return { ok: false, error: "Turn on branches first." };
    if (existing.some((b) => b.name.toLowerCase() === name.toLowerCase() && b.id !== id)) {
      return { ok: false, error: `A branch called "${name}" already exists.` };
    }

    const fields = { name, code: code || null, address: address || null, phone: phone || null };

    if (id) {
      const before = existing.find((b) => b.id === id);
      if (!before) return { ok: false, error: "Branch not found" };
      const { error } = await supabaseAdmin
        .from("store_branches")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("store_id", storeId);
      if (error) return { ok: false, error: "Could not save the branch. Please try again." };
      await logActivity(auth.actor, {
        action: "branch.update",
        entityType: "branch",
        entityId: id,
        summary: `Updated branch ${name}`,
        details: { before, after: fields },
      });
      return { ok: true, data: { id } };
    }

    const limit = checkLimit(auth.subscription, MAX_BRANCHES_LIMIT, existing.length);
    if (!limit.allowed) return { ok: false, error: `Your plan allows up to ${limit.limit} branches.` };

    const nextPriority = Math.max(0, ...existing.map((b) => b.priority)) + 1;
    const { data, error } = await supabaseAdmin
      .from("store_branches")
      .insert({ store_id: storeId, priority: nextPriority, ...fields })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Could not add the branch. Please try again." };

    await logActivity(auth.actor, {
      action: "branch.create",
      entityType: "branch",
      entityId: data.id,
      summary: `Added branch ${name}`,
    });
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    console.error("saveBranch failed:", err);
    return { ok: false, error: "Could not save the branch. Please try again." };
  }
}

/** New priority order: the first id becomes priority 1. */
export async function reorderBranches(branchIds: string[]): Promise<BranchActionResult> {
  try {
    const auth = await ownerWithBranchFeature();
    if (!auth.ok) return auth;
    if (!Array.isArray(branchIds) || branchIds.some((id) => typeof id !== "string")) {
      return { ok: false, error: "Invalid order" };
    }
    const { error } = await supabaseAdmin.rpc("reorder_store_branches", {
      p_store_id: auth.actor.storeId,
      p_branch_ids: branchIds,
    });
    if (error) {
      console.error("reorder_store_branches failed:", error.message);
      return { ok: false, error: "Could not save the new order. Please refresh and try again." };
    }
    await logActivity(auth.actor, { action: "branch.reorder", entityType: "branch", summary: "Changed branch priority" });
    return { ok: true };
  } catch (err) {
    console.error("reorderBranches failed:", err);
    return { ok: false, error: "Could not save the new order. Please try again." };
  }
}

export async function setBranchActive(branchId: string, active: boolean): Promise<BranchActionResult> {
  try {
    const auth = await ownerWithBranchFeature();
    if (!auth.ok) return auth;
    const { storeId } = auth.actor;

    const branches = await loadBranches(storeId);
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return { ok: false, error: "Branch not found" };
    if (branch.is_active === active) return { ok: true };

    if (!active) {
      if (branches.filter((b) => b.is_active).length <= 1) {
        return { ok: false, error: "At least one branch must stay active." };
      }
      const totals = await loadBranchTotals(storeId);
      if ((totals.get(branchId)?.reserved ?? 0) > 0) {
        return {
          ok: false,
          error: "This branch is holding stock for pending orders. Finish or move those orders first.",
        };
      }
    }

    const { error } = await supabaseAdmin
      .from("store_branches")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", branchId)
      .eq("store_id", storeId);
    if (error) return { ok: false, error: "Could not update the branch. Please try again." };

    await logActivity(auth.actor, {
      action: active ? "branch.activate" : "branch.deactivate",
      entityType: "branch",
      entityId: branchId,
      summary: `${active ? "Activated" : "Deactivated"} branch ${branch.name}`,
    });
    return { ok: true };
  } catch (err) {
    console.error("setBranchActive failed:", err);
    return { ok: false, error: "Could not update the branch. Please try again." };
  }
}

/** Only an empty branch with no transfer history can be deleted; otherwise deactivate it. */
export async function deleteBranch(branchId: string): Promise<BranchActionResult> {
  try {
    const auth = await ownerWithBranchFeature();
    if (!auth.ok) return auth;
    const { storeId } = auth.actor;

    const branches = await loadBranches(storeId);
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return { ok: false, error: "Branch not found" };
    if (branches.length <= 1) return { ok: false, error: "A store with branches needs at least one branch." };

    const totals = await loadBranchTotals(storeId);
    const t = totals.get(branchId);
    if ((t?.available ?? 0) !== 0 || (t?.reserved ?? 0) !== 0) {
      return { ok: false, error: "This branch still has stock. Move it to another branch first, or deactivate the branch." };
    }

    const { count } = await supabaseAdmin
      .from("branch_stock_transfers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`);
    if ((count ?? 0) > 0) {
      return { ok: false, error: "This branch has transfer history, so it can't be deleted. Deactivate it instead." };
    }

    const { error } = await supabaseAdmin.from("store_branches").delete().eq("id", branchId).eq("store_id", storeId);
    if (error) return { ok: false, error: "Could not delete the branch. Please try again." };

    // Close the gap in priorities so 1..n stays contiguous.
    const remaining = branches.filter((b) => b.id !== branchId).map((b) => b.id);
    await supabaseAdmin.rpc("reorder_store_branches", { p_store_id: storeId, p_branch_ids: remaining });

    await logActivity(auth.actor, {
      action: "branch.delete",
      entityType: "branch",
      entityId: branchId,
      summary: `Deleted branch ${branch.name}`,
      details: { deleted_record: branch },
    });
    return { ok: true };
  } catch (err) {
    console.error("deleteBranch failed:", err);
    return { ok: false, error: "Could not delete the branch. Please try again." };
  }
}
