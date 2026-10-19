"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { getVariantListPrice } from "@/lib/utils/variantProductPricing";
import { adjustMrp, type AdjustedPrice, type MrpAdjustMode } from "@/lib/utils/mrpAdjust";

export type BulkMrpMode = MrpAdjustMode;

export interface BulkMrpInput {
  productIds: string[];
  mode: BulkMrpMode;
  /** Signed change: +10 raises MRP by 10% (or by 10 in money), -10 lowers it. */
  value: number;
}

export interface BulkMrpResult {
  success: boolean;
  error?: string;
  /** Products whose MRP was changed. */
  updated: number;
  /** Products left alone because the new MRP would be zero or negative. */
  skipped: number;
}

/**
 * Raises or lowers the MRP (base price) of the chosen products by a percentage
 * or a flat amount. Variants are changed too, and a variant product's own
 * base price follows its cheapest active variant like everywhere else.
 */
export async function bulkUpdateMrp(input: BulkMrpInput): Promise<BulkMrpResult> {
  const storeResult = await getAuthorizedStoreId("products.edit");
  if (!storeResult.ok) return { success: false, error: storeResult.error, updated: 0, skipped: 0 };

  const { productIds, mode, value } = input;
  if (productIds.length === 0) {
    return { success: false, error: "Select at least one product.", updated: 0, skipped: 0 };
  }
  if (!Number.isFinite(value) || value === 0) {
    return { success: false, error: "Enter a change other than zero.", updated: 0, skipped: 0 };
  }
  if (mode === "percent" && value <= -100) {
    return { success: false, error: "A decrease can't be 100% or more.", updated: 0, skipped: 0 };
  }

  try {
    const { data: products, error: fetchError } = await supabaseAdmin
      .from("products")
      .select(
        "id, base_price, discounted_price, discount_amount, product_variants(id, is_active, base_price, discounted_price, discount_amount)",
      )
      .eq("store_id", storeResult.storeId)
      .in("id", productIds);
    if (fetchError) throw fetchError;

    let updated = 0;
    let skipped = 0;

    for (const product of products ?? []) {
      const variants = product.product_variants ?? [];

      if (variants.length === 0) {
        const update = adjustMrp(product, mode, value);
        if (!update) {
          skipped++;
          continue;
        }
        const { error } = await supabaseAdmin
          .from("products")
          .update(update)
          .eq("id", product.id)
          .eq("store_id", storeResult.storeId);
        if (error) throw error;
        updated++;
        continue;
      }

      // All-or-nothing per product, so its variants never end up half changed.
      const changes = variants.map((v) => ({ id: v.id, is_active: v.is_active, update: adjustMrp(v, mode, value) }));
      if (changes.some((c) => c.update === null)) {
        skipped++;
        continue;
      }

      for (const change of changes) {
        const { error } = await supabaseAdmin
          .from("product_variants")
          .update(change.update as AdjustedPrice)
          .eq("id", change.id);
        if (error) throw error;
      }

      const listPrice = getVariantListPrice(
        changes.map((c) => ({ is_active: c.is_active, base_price: (c.update as AdjustedPrice).base_price })),
      );
      if (listPrice !== undefined) {
        const { error } = await supabaseAdmin
          .from("products")
          .update({ base_price: listPrice })
          .eq("id", product.id)
          .eq("store_id", storeResult.storeId);
        if (error) throw error;
      }
      updated++;
    }

    return { success: true, updated, skipped };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not update prices.",
      updated: 0,
      skipped: 0,
    };
  }
}
