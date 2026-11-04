"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, BRANCH_SCOPE_ERROR, canUseBranch, logActivity } from "@/lib/permissions/server";
import { adjustInventory } from "@/lib/queries/inventory/updateInventory";
import type { ReturnToSupplierInput } from "./purchaseTypes";

/**
 * Returning goods to a supplier: the stock of each product goes down and the supplier's
 * account is credited (a "credit" ledger entry), so Accounts payable falls by what they credit.
 * No cost change (the remaining stock keeps its average cost) and no cash moves.
 * Needs both the stock edit and supplier bills permissions.
 */

const returnSchema = z.object({
  supplierId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  note: z.string().trim().max(300, "Note is too long").optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be above zero").max(1_000_000),
        /** What the supplier credits for one unit. */
        unitCredit: z.number().min(0, "Credit cannot be negative").max(1_000_000_000, "Amount is too large"),
      }),
    )
    .min(1, "Add at least one product")
    .max(200, "Too many products in one return"),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Takes the goods out of stock and credits the supplier's account.
 * @returns the credit amount, or why it failed (stock already taken out is put back)
 */
export async function returnToSupplier(
  storeId: string,
  input: ReturnToSupplierInput,
): Promise<{ success: true; credit: number } | { success: false; error: string }> {
  const taken: { productId: string; variantId: string | null; quantity: number }[] = [];
  const branch = (id: string | null | undefined) => id ?? null;
  try {
    const stockAuth = await authorizeForStore(storeId, "stock.edit");
    if (!stockAuth.ok) return { success: false, error: stockAuth.error };
    const moneyAuth = await authorizeForStore(storeId, "stock.supplier_money");
    if (!moneyAuth.ok) return { success: false, error: moneyAuth.error };
    const actor = moneyAuth.actor;

    const parsed = returnSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;
    if (v.branchId && !canUseBranch(actor, v.branchId)) return { success: false, error: BRANCH_SCOPE_ERROR };

    const { data: supplier } = await supabaseAdmin.from("suppliers").select("id, name").eq("id", v.supplierId).eq("store_id", storeId).maybeSingle();
    if (!supplier) return { success: false, error: "Supplier not found" };

    // The credit is the product's TP, so it cannot be edited: the TP on file is used whenever there is one.
    // The typed value only counts for a product that has no TP yet.
    const productIds = [...new Set(v.items.map((i) => i.productId))];
    const { data: tpRows } = await supabaseAdmin.from("products").select("id, tp_price").eq("store_id", storeId).in("id", productIds);
    const variantIds = v.items.map((i) => i.variantId).filter((id): id is string => !!id);
    const { data: variantRows } = variantIds.length > 0 ? await supabaseAdmin.from("product_variants").select("id, tp_price").in("id", variantIds) : { data: [] };
    const productTp = new Map(((tpRows ?? []) as { id: string; tp_price: number | null }[]).map((r) => [r.id, Number(r.tp_price) || 0]));
    const variantTp = new Map(((variantRows ?? []) as { id: string; tp_price: number | null }[]).map((r) => [r.id, Number(r.tp_price) || 0]));
    if (productTp.size !== productIds.length) return { success: false, error: "A product was not found" };
    const unitCreditFor = (i: (typeof v.items)[number]): number => {
      const tp = (i.variantId ? variantTp.get(i.variantId) : 0) || productTp.get(i.productId) || 0;
      return tp > 0 ? tp : i.unitCredit;
    };
    const credit = round2(v.items.reduce((sum, i) => sum + round2(i.quantity * unitCreditFor(i)), 0));
    if (credit <= 0) return { success: false, error: "Enter what the supplier credits for the goods" };

    // Stock first: the database refuses to take out more than is there.
    for (const item of v.items) {
      await adjustInventory({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        branch_id: branch(v.branchId),
        delta: -item.quantity,
        reason: "supplier_return",
        note: v.note || `Returned to ${(supplier as { name: string }).name}`,
      });
      taken.push({ productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity });
    }

    const { error } = await supabaseAdmin.from("supplier_ledger").insert({
      store_id: storeId,
      supplier_id: v.supplierId,
      kind: "credit",
      amount: credit,
      entry_date: v.date,
      note: v.note || `Goods returned (${v.items.length} products)`,
      branch_id: branch(v.branchId),
      created_by: actor.userId,
    });
    if (error) throw new Error(error.message);

    await logActivity(actor, {
      action: "stock.supplier",
      branchId: branch(v.branchId),
      entityType: "supplier_ledger",
      entityId: null,
      summary: `Returned goods to ${(supplier as { name: string }).name}: credit ৳${credit}`,
    });
    return { success: true, credit };
  } catch (error) {
    // Put back whatever was already taken out, so stock and the supplier's account stay in step.
    for (const t of taken) {
      try {
        await adjustInventory({
          product_id: t.productId,
          variant_id: t.variantId,
          branch_id: branch(input.branchId),
          delta: t.quantity,
          reason: "supplier_return_undo",
          note: "A return to a supplier failed, so the stock was put back",
        });
      } catch (undoError) {
        console.error("Could not put returned stock back:", undoError);
      }
    }
    const message = error instanceof Error ? error.message : "Failed to save the return";
    return { success: false, error: message.startsWith("Insufficient stock") ? "There is not enough stock to return that many." : message };
  }
}
