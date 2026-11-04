"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  authorizeForStore,
  BRANCH_SCOPE_ERROR,
  canUseBranch,
  checkStockAdjustmentLimit,
  logActivity,
} from "@/lib/permissions/server";
import type { ReceivePurchaseInput, ReceivePurchaseResult } from "./purchaseTypes";
import { addDaysIso, loadSupplierTermsDays } from "./supplierTerms";
import { resolveFunder } from "@/lib/queries/financial/resolveFunder";
import { buildPaymentRow, insertLedgerRows } from "./supplierPaymentRow";

const PAYMENT_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"] as const;

const money = z.number().min(0, "Cost cannot be negative").max(1_000_000_000, "Amount is too large");

const receiveSchema = z.object({
  supplierId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  billNo: z.string().trim().max(60, "Bill number is too long").optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid due date")
    .nullable()
    .optional(),
  note: z.string().trim().max(300, "Note is too long").optional(),
  /** Storage path of the bill photo (see supplierBillPhotos.ts), not a web address. */
  attachmentUrl: z.string().max(500).nullable().optional(),
  fromDraftId: z.string().uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be above zero").max(1_000_000),
        unitCost: money.refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most 2 decimals"),
      }),
    )
    .min(1, "Add at least one product")
    .max(200, "Too many products in one purchase"),
  paidAmount: money.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paidFrom: z.enum(["shop", "outside"]).optional(),
  paidBranchId: z.string().uuid().nullable().optional(),
  funderId: z.string().uuid().nullable().optional(),
  funderTreatment: z.enum(["capital", "loan"]).nullable().optional(),
  extraPayments: z
    .array(
      z.object({
        amount: z.number().positive("Enter an amount above zero for every part").max(1_000_000_000, "Amount is too large"),
        paymentMethod: z.enum(PAYMENT_METHODS).optional(),
        paidFrom: z.enum(["shop", "outside"]).optional(),
        branchId: z.string().uuid().nullable().optional(),
        billBranchId: z.string().uuid().nullable().optional(),
        funderId: z.string().uuid().nullable().optional(),
        funderTreatment: z.enum(["capital", "loan"]).nullable().optional(),
      }),
    )
    .max(9, "Too many parts in one payment")
    .optional(),
});

/**
 * Receives stock from a supplier in one step: adds the stock, moves each
 * product's cost to the weighted average, adds the supplier bill, and adds the
 * payment too when part was paid now. All of it happens in one database
 * transaction (receive_purchase), so stock, cost, bill and payment never disagree.
 * Needs both the stock edit and supplier bills permissions.
 * @returns the new purchase, or why it failed
 */
export async function receivePurchase(storeId: string, input: ReceivePurchaseInput): Promise<ReceivePurchaseResult> {
  try {
    const stockAuth = await authorizeForStore(storeId, "stock.edit");
    if (!stockAuth.ok) return { success: false, error: stockAuth.error };
    const moneyAuth = await authorizeForStore(storeId, "stock.supplier_money");
    if (!moneyAuth.ok) return { success: false, error: moneyAuth.error };
    const actor = moneyAuth.actor;

    const parsed = receiveSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    if (v.branchId && !canUseBranch(actor, v.branchId)) return { success: false, error: BRANCH_SCOPE_ERROR };
    for (const item of v.items) {
      const limited = checkStockAdjustmentLimit(actor, item.quantity);
      if (limited) return { success: false, error: limited };
    }
    // All parts of the payment together cannot be more than the bill.
    const extraTotal = (v.extraPayments ?? []).reduce((sum, p) => sum + p.amount, 0);
    const billTotal = v.items.reduce((sum, i) => sum + Math.round(i.quantity * i.unitCost * 100) / 100, 0);
    if ((v.paidAmount ?? 0) + extraTotal > billTotal + 0.005) {
      return { success: false, error: "The payment cannot be more than the bill" };
    }
    if (v.attachmentUrl && (!v.attachmentUrl.startsWith(`${storeId}/`) || v.attachmentUrl.includes(".."))) {
      return { success: false, error: "That photo does not belong to this store" };
    }
    if (v.dueDate && v.dueDate < v.purchaseDate) {
      return { success: false, error: "The due date cannot be before the purchase date" };
    }

    // "Who paid" only counts for money from outside the shop, and the person must be on this store's list.
    const funder = await resolveFunder(storeId, v.paidFrom, v.funderId, v.funderTreatment, { amount: v.paidAmount ?? 0 });
    if (!funder.ok) return { success: false, error: funder.error };
    // Money taken from each investor's account so far, so the extra parts are checked together with the first.
    const taken = new Map<string, number>();
    if (funder.funderId) taken.set(funder.funderId, v.paidAmount ?? 0);

    // No pay-by date typed: use this supplier's own terms, if it has any, so the bill can be flagged when late.
    let dueDate = v.dueDate ?? null;
    if (!dueDate) {
      const days = (await loadSupplierTermsDays(storeId)).get(v.supplierId);
      if (days) dueDate = addDaysIso(v.purchaseDate, days);
    }

    const { data, error } = await supabaseAdmin.rpc("receive_purchase", {
      p_store_id: storeId,
      p_supplier_id: v.supplierId,
      p_branch_id: v.branchId ?? null,
      p_bill_no: v.billNo || null,
      p_purchase_date: v.purchaseDate,
      p_due_date: dueDate,
      p_note: v.note || null,
      p_attachment_url: v.attachmentUrl ?? null,
      p_items: v.items.map((i) => ({
        product_id: i.productId,
        variant_id: i.variantId ?? null,
        quantity: i.quantity,
        unit_cost: i.unitCost,
      })),
      p_paid_amount: v.paidAmount ?? 0,
      p_payment_method: v.paymentMethod ?? "cash",
      p_paid_from: v.paidFrom ?? "shop",
      p_created_by: actor.userId,
    });

    if (error) {
      // The unique bill number index: say it in the owner's words.
      if (error.code === "23505") {
        return { success: false, error: "This supplier already has a purchase with that bill number" };
      }
      return { success: false, error: error.message };
    }

    // The delivery this draft planned has arrived: the draft is no longer needed.
    if (v.fromDraftId) {
      await supabaseAdmin.from("purchases").delete().eq("id", v.fromDraftId).eq("store_id", storeId).eq("status", "draft");
    }

    const row = data as { purchase_id: string; total: number; bill_amount: number; paid_amount: number };

    // More parts of the payment (another branch's money, another method, an investor): each is a payment of its own.
    let warning: string | undefined;
    if ((v.extraPayments ?? []).length > 0) {
      const rows: Record<string, unknown>[] = [];
      let failure: string | null = null;
      for (const line of v.extraPayments ?? []) {
        // Paying this delivery's bill: every part is applied to the bills of the branch that received the goods.
        const built = await buildPaymentRow(storeId, v.supplierId, v.purchaseDate, `Paid with purchase${v.billNo ? ` ${v.billNo}` : ""}`, { ...line, billBranchId: line.billBranchId ?? v.branchId ?? null }, actor.userId, { purchase_id: row.purchase_id }, taken);
        if (!built.ok) {
          failure = built.error;
          break;
        }
        rows.push(built.row);
      }
      if (!failure && rows.length > 0) {
        failure = await insertLedgerRows(rows);
      }
      if (failure) warning = `The delivery and the first payment were saved, but the other parts of the payment were not (${failure}). Add them from Supplier Bills.`;
    }

    // The payment made with the delivery pays the bills of the branch that received the goods (best effort: a database
    // without the bill branch column keeps working and applies it to the branch whose money paid).
    if (v.branchId && row.paid_amount > 0) {
      await supabaseAdmin
        .from("supplier_ledger")
        .update({ bill_branch_id: v.branchId })
        .eq("store_id", storeId)
        .eq("purchase_id", row.purchase_id)
        .eq("kind", "payment")
        .is("bill_branch_id", null);
    }

    // Money from an owner or investor: record who paid and how it counts (capital, or a loan the shop repays).
    if (funder.funderId && row.paid_amount > 0) {
      const { error: funderError } = await supabaseAdmin
        .from("supplier_ledger")
        .update({ funder_id: funder.funderId, funder_treatment: funder.treatment })
        .eq("store_id", storeId)
        .eq("purchase_id", row.purchase_id)
        .eq("kind", "payment");
      if (funderError) console.error("Could not record who paid the supplier:", funderError.message);
    }

    // The payment made with the delivery came out of this branch's money, which may not be the branch that received the goods.
    if (v.paidBranchId && v.paidBranchId !== (v.branchId ?? null) && (v.paidFrom ?? "shop") === "shop" && row.paid_amount > 0) {
      if (!canUseBranch(actor, v.paidBranchId)) return { success: false, error: BRANCH_SCOPE_ERROR };
      const { data: payBranch } = await supabaseAdmin.from("store_branches").select("id").eq("id", v.paidBranchId).eq("store_id", storeId).maybeSingle();
      if (!payBranch) return { success: false, error: "Branch not found" };
      const { error: moveError } = await supabaseAdmin
        .from("supplier_ledger")
        .update({ branch_id: payBranch.id })
        .eq("store_id", storeId)
        .eq("purchase_id", row.purchase_id)
        .eq("kind", "payment");
      if (moveError) console.error("Could not set the branch that paid the supplier:", moveError.message);
    }

    await logActivity(actor, {
      action: "stock.purchase",
      branchId: v.branchId ?? null,
      entityType: "purchase",
      entityId: row.purchase_id,
      summary: `Received stock ৳${row.total}${v.billNo ? ` · bill ${v.billNo}` : ""}`,
      details: {
        supplier_id: v.supplierId,
        items: v.items.length,
        paid_amount: row.paid_amount,
        purchase_date: v.purchaseDate,
        due_date: dueDate,
      },
    });

    return {
      success: true,
      purchaseId: row.purchase_id,
      total: Number(row.total),
      billAmount: Number(row.bill_amount),
      paidAmount: Number(row.paid_amount) + (warning ? 0 : (v.extraPayments ?? []).reduce((sum, p) => sum + p.amount, 0)),
      ...(warning ? { warning } : {}),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to receive the stock" };
  }
}
