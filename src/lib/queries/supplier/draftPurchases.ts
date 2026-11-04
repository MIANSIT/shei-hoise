"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, BRANCH_SCOPE_ERROR, canUseBranch, logActivity } from "@/lib/permissions/server";
import type { DraftPurchaseDetail, DraftPurchaseInput, DraftPurchaseSummary } from "./purchaseTypes";

/**
 * Saved draft orders: a planned delivery kept for later. A draft is a purchase with status
 * "draft": it adds no stock, no cost change and no supplier bill. When the goods arrive it is
 * received on Receive Stock like any delivery, and the draft is removed.
 * Needs both the stock edit and supplier bills permissions, like receiving.
 */

const MAX_DRAFTS_SHOWN = 50;

const draftSchema = z.object({
  draftId: z.string().uuid().nullable().optional(),
  supplierId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid due date").nullable().optional(),
  note: z.string().trim().max(300, "Note is too long").optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be above zero").max(1_000_000),
        unitCost: z.number().min(0, "Cost cannot be negative").max(1_000_000_000, "Amount is too large"),
        label: z.string().trim().max(300).optional(),
      }),
    )
    .min(1, "Add at least one product")
    .max(200, "Too many products in one order"),
});

type Failure = { success: false; error: string };

async function authorize(storeId: string) {
  const stock = await authorizeForStore(storeId, "stock.edit");
  if (!stock.ok) return stock;
  return authorizeForStore(storeId, "stock.supplier_money");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Saves a planned delivery as a draft (or updates the one being edited).
 * @returns the draft's id, or why it failed
 */
export async function saveDraftPurchase(storeId: string, input: DraftPurchaseInput): Promise<{ success: true; draftId: string } | Failure> {
  try {
    const auth = await authorize(storeId);
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;
    if (v.branchId && !canUseBranch(auth.actor, v.branchId)) return { success: false, error: BRANCH_SCOPE_ERROR };

    const { data: supplier } = await supabaseAdmin.from("suppliers").select("id").eq("id", v.supplierId).eq("store_id", storeId).maybeSingle();
    if (!supplier) return { success: false, error: "Supplier not found" };

    const total = round2(v.items.reduce((sum, i) => sum + round2(i.quantity * i.unitCost), 0));
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

    let draftId = v.draftId ?? null;
    if (draftId) {
      const { data: existing } = await supabaseAdmin
        .from("purchases")
        .select("id, status")
        .eq("id", draftId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (!existing || (existing as { status: string }).status !== "draft") return { success: false, error: "That saved order was not found" };
      const { error } = await supabaseAdmin
        .from("purchases")
        .update({ supplier_id: v.supplierId, branch_id: v.branchId ?? null, due_date: v.dueDate ?? null, note: v.note || null, total })
        .eq("id", draftId)
        .eq("store_id", storeId);
      if (error) return { success: false, error: error.message };
      await supabaseAdmin.from("purchase_items").delete().eq("purchase_id", draftId);
    } else {
      const { data, error } = await supabaseAdmin
        .from("purchases")
        .insert({
          store_id: storeId,
          branch_id: v.branchId ?? null,
          supplier_id: v.supplierId,
          purchase_date: today,
          due_date: v.dueDate ?? null,
          status: "draft",
          total,
          note: v.note || null,
          created_by: auth.actor.userId,
        })
        .select("id")
        .single();
      if (error || !data) return { success: false, error: error?.message ?? "Could not save the order" };
      draftId = data.id as string;
    }

    const { error: itemsError } = await supabaseAdmin.from("purchase_items").insert(
      v.items.map((i) => ({
        purchase_id: draftId,
        store_id: storeId,
        product_id: i.productId,
        variant_id: i.variantId ?? null,
        product_name: i.label || null,
        quantity_ordered: i.quantity,
        unit_cost: i.unitCost,
      })),
    );
    if (itemsError) return { success: false, error: itemsError.message };

    await logActivity(auth.actor, {
      action: "stock.purchase",
      branchId: v.branchId ?? null,
      entityType: "purchase",
      entityId: draftId,
      summary: `Saved a draft order of ৳${total} (${v.items.length} products)`,
    });
    return { success: true, draftId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the order" };
  }
}

/**
 * The saved draft orders, newest first.
 * @returns the drafts, or an empty list when none or not allowed
 */
export async function listDraftPurchases(storeId: string): Promise<DraftPurchaseSummary[]> {
  try {
    const auth = await authorize(storeId);
    if (!auth.ok) return [];

    const { data, error } = await supabaseAdmin
      .from("purchases")
      .select("id, supplier_id, total, note, created_at, branch_id, purchase_items(id)")
      .eq("store_id", storeId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(MAX_DRAFTS_SHOWN);
    if (error) return [];

    const rows = (data ?? []) as unknown as { id: string; supplier_id: string; total: number; note: string | null; created_at: string; branch_id: string | null; purchase_items: { id: string }[] | null }[];
    const supplierIds = [...new Set(rows.map((r) => r.supplier_id))];
    const names = new Map<string, string>();
    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabaseAdmin.from("suppliers").select("id, name").in("id", supplierIds).eq("store_id", storeId);
      for (const s of (suppliers ?? []) as { id: string; name: string }[]) names.set(s.id, s.name);
    }
    return rows.map((r) => ({
      id: r.id,
      supplierId: r.supplier_id,
      supplierName: names.get(r.supplier_id) ?? "—",
      branchId: r.branch_id,
      total: Number(r.total) || 0,
      lines: r.purchase_items?.length ?? 0,
      note: r.note,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * One saved draft with each line's current stock and cost, ready to continue on Receive Stock.
 * @returns the draft, or why it could not be opened
 */
export async function getDraftPurchase(storeId: string, draftId: string): Promise<{ success: true; draft: DraftPurchaseDetail } | Failure> {
  try {
    const auth = await authorize(storeId);
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("id, supplier_id, branch_id, due_date, note, status")
      .eq("id", draftId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!purchase || (purchase as { status: string }).status !== "draft") return { success: false, error: "That saved order was not found" };
    const p = purchase as { id: string; supplier_id: string; branch_id: string | null; due_date: string | null; note: string | null };

    const { data: items, error } = await supabaseAdmin
      .from("purchase_items")
      .select("product_id, variant_id, product_name, quantity_ordered, unit_cost")
      .eq("purchase_id", draftId)
      .eq("store_id", storeId);
    if (error) return { success: false, error: error.message };
    const rows = (items ?? []) as { product_id: string; variant_id: string | null; product_name: string | null; quantity_ordered: number; unit_cost: number }[];

    // Stock and cost as they are today, so the average-cost hint and the unit cost warning use fresh numbers.
    const productIds = [...new Set(rows.map((r) => r.product_id))];
    const [productsRes, variantsRes, inventoryRes] = await Promise.all([
      supabaseAdmin.from("products").select("id, tp_price").eq("store_id", storeId).in("id", productIds),
      supabaseAdmin.from("product_variants").select("id, tp_price").in("product_id", productIds),
      supabaseAdmin.from("product_inventory").select("product_id, variant_id, quantity_available").in("product_id", productIds),
    ]);
    const productCost = new Map(((productsRes.data ?? []) as { id: string; tp_price: number | null }[]).map((x) => [x.id, x.tp_price]));
    const variantCost = new Map(((variantsRes.data ?? []) as { id: string; tp_price: number | null }[]).map((x) => [x.id, x.tp_price]));
    const stock = new Map<string, number>();
    for (const inv of (inventoryRes.data ?? []) as { product_id: string; variant_id: string | null; quantity_available: number | null }[]) {
      const key = inv.variant_id ? `${inv.product_id}:${inv.variant_id}` : inv.product_id;
      stock.set(key, (stock.get(key) ?? 0) + (Number(inv.quantity_available) || 0));
    }

    return {
      success: true,
      draft: {
        id: p.id,
        supplierId: p.supplier_id,
        branchId: p.branch_id,
        dueDate: p.due_date,
        note: p.note,
        lines: rows
          .filter((r) => productCost.has(r.product_id))
          .map((r) => {
            const key = r.variant_id ? `${r.product_id}:${r.variant_id}` : r.product_id;
            const cost = (r.variant_id ? variantCost.get(r.variant_id) : null) ?? productCost.get(r.product_id) ?? null;
            return {
              productId: r.product_id,
              variantId: r.variant_id,
              label: r.product_name ?? "",
              quantity: r.quantity_ordered,
              unitCost: Number(r.unit_cost) || 0,
              stock: stock.get(key) ?? 0,
              cost: cost === null ? null : Number(cost),
            };
          }),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to open the order" };
  }
}

/**
 * Deletes a saved draft order.
 * @returns success, or why it failed
 */
export async function deleteDraftPurchase(storeId: string, draftId: string): Promise<{ success: true } | Failure> {
  try {
    const auth = await authorize(storeId);
    if (!auth.ok) return { success: false, error: auth.error };
    const { data, error } = await supabaseAdmin
      .from("purchases")
      .delete()
      .eq("id", draftId)
      .eq("store_id", storeId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "That saved order was not found" };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete the order" };
  }
}
