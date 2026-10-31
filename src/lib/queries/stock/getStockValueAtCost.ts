import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface StockValueAtCost {
  /** Units on the shelf that are tracked. */
  units: number;
  /** Those units valued at what they cost the shop (tp_price). */
  value: number;
  /** Units with no cost price set — their value can't be counted, so the figure is understated. */
  unitsMissingCost: number;
}

const EMPTY: StockValueAtCost = { units: 0, value: 0, unitsMissingCost: 0 };

interface InventoryRow {
  product_id: string | null;
  variant_id: string | null;
  quantity_available: number | null;
  track_inventory: boolean | null;
  products: { store_id: string; tp_price: number | null } | null;
  product_variants: { tp_price: number | null; is_active: boolean | null } | null;
}

interface BranchRow {
  product_id: string;
  variant_id: string | null;
  quantity_available: number | null;
}

/**
 * Unsold stock valued at cost — what the shelf is worth as an asset, which is
 * what the Accounts view needs. The dashboard's "Inventory value" card is the
 * same shelf at selling price, a different question.
 *
 * Counts only tracked inventory and active variants, the same rules the
 * dashboard inventory summary uses, so the unit counts agree.
 * @returns the value, or zeros when the query fails
 */
export async function getStockValueAtCost(
  storeId: string,
  /** Stores with branches: that branch's shelf (branch_inventory). Omitted/null = the whole store. */
  branchId?: string | null,
): Promise<StockValueAtCost> {
  if (!storeId) return EMPTY;

  try {
    const [rows, branchRows] = await Promise.all([
      fetchAllPaged<InventoryRow>((from, to) =>
        supabase
          .from("product_inventory")
          .select(
            "product_id, variant_id, quantity_available, track_inventory, products!inner(store_id, tp_price), product_variants(tp_price, is_active)",
          )
          .eq("products.store_id", storeId)
          .order("id")
          .range(from, to) as unknown as PromiseLike<{
          data: InventoryRow[] | null;
          error: { message: string } | null;
        }>,
      ),
      branchId
        ? fetchAllPaged<BranchRow>((from, to) =>
            supabase
              .from("branch_inventory")
              .select("product_id, variant_id, quantity_available")
              .eq("store_id", storeId)
              .eq("branch_id", branchId)
              .order("id")
              .range(from, to) as unknown as PromiseLike<{
              data: BranchRow[] | null;
              error: { message: string } | null;
            }>,
          )
        : Promise.resolve([] as BranchRow[]),
    ]);

    const branchQty = new Map<string, number>();
    for (const row of branchRows) {
      branchQty.set(
        `${row.product_id}:${row.variant_id ?? ""}`,
        Number(row.quantity_available ?? 0),
      );
    }

    let units = 0;
    let value = 0;
    let unitsMissingCost = 0;

    for (const row of rows) {
      if (row.track_inventory === false) continue;
      // A variant that's been switched off isn't sellable stock.
      if (row.variant_id && row.product_variants?.is_active === false) continue;
      const quantity = branchId
        ? (branchQty.get(`${row.product_id}:${row.variant_id ?? ""}`) ?? 0)
        : Number(row.quantity_available ?? 0);
      if (quantity <= 0) continue;

      const cost = row.variant_id
        ? Number(row.product_variants?.tp_price ?? row.products?.tp_price ?? 0)
        : Number(row.products?.tp_price ?? 0);

      units += quantity;
      if (cost > 0) value += quantity * cost;
      else unitsMissingCost += quantity;
    }

    return { units, value, unitsMissingCost };
  } catch (error) {
    console.error("Failed to load stock value at cost:", error);
    return EMPTY;
  }
}
