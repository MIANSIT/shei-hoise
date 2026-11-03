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
  attachmentUrl: z.string().url().max(500).nullable().optional(),
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
    if (v.dueDate && v.dueDate < v.purchaseDate) {
      return { success: false, error: "The due date cannot be before the purchase date" };
    }

    const { data, error } = await supabaseAdmin.rpc("receive_purchase", {
      p_store_id: storeId,
      p_supplier_id: v.supplierId,
      p_branch_id: v.branchId ?? null,
      p_bill_no: v.billNo || null,
      p_purchase_date: v.purchaseDate,
      p_due_date: v.dueDate ?? null,
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

    const row = data as { purchase_id: string; total: number; bill_amount: number; paid_amount: number };

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
        due_date: v.dueDate ?? null,
      },
    });

    return {
      success: true,
      purchaseId: row.purchase_id,
      total: Number(row.total),
      billAmount: Number(row.bill_amount),
      paidAmount: Number(row.paid_amount),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to receive the stock" };
  }
}
