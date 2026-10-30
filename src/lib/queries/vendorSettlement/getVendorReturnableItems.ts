import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import type { VendorReturnableItem } from "@/lib/types/vendor/type";

interface ItemRow {
  product_id: string;
  variant_id: string | null;
  sold_quantity: number;
  returned_quantity: number;
  unit_price: number;
  receivable_amount: number;
  settlement: { settlement_date: string; vendor_id: string } | null;
  product: { name: string } | null;
  variant: { variant_name: string | null } | null;
}

/**
 * What a vendor bought (settled as sold) and can still bring back: units sold
 * to them minus units already returned after sale, with the price they paid
 * last time. A return is a settlement item with a negative receivable, so
 * "bought" counts the non-negative rows and "given back" the negative ones.
 * @returns the returnable products, most recently settled first; empty on failure
 */
export async function getVendorReturnableItems(vendorId: string): Promise<VendorReturnableItem[]> {
  if (!vendorId) return [];
  try {
    const rows = await fetchAllPaged<ItemRow>((from, to) =>
      supabase
        .from("vendor_settlement_items")
        .select(
          `product_id, variant_id, sold_quantity, returned_quantity, unit_price, receivable_amount,
           settlement:vendor_settlements!inner(settlement_date, vendor_id),
           product:products(name),
           variant:product_variants(variant_name)`,
        )
        .eq("settlement.vendor_id", vendorId)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{
        data: ItemRow[] | null;
        error: { message: string } | null;
      }>,
    );

    const byKey = new Map<string, VendorReturnableItem & { lastDate: string }>();
    for (const row of rows) {
      const key = `${row.product_id}:${row.variant_id ?? ""}`;
      const entry = byKey.get(key) ?? {
        product_id: row.product_id,
        variant_id: row.variant_id,
        product_name: row.product?.name ?? "",
        variant_name: row.variant?.variant_name ?? null,
        returnable: 0,
        last_unit_price: 0,
        lastDate: "",
      };
      if (Number(row.receivable_amount) < 0) {
        entry.returnable -= Number(row.returned_quantity);
      } else if (Number(row.sold_quantity) > 0) {
        entry.returnable += Number(row.sold_quantity);
        const date = row.settlement?.settlement_date ?? "";
        if (date >= entry.lastDate) {
          entry.lastDate = date;
          entry.last_unit_price = Number(row.unit_price);
        }
      }
      byKey.set(key, entry);
    }

    return [...byKey.values()]
      .filter((e) => e.returnable > 0)
      .sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1))
      .map(({ lastDate: _lastDate, ...item }) => item);
  } catch (error) {
    console.error("Failed to load returnable vendor items:", error);
    return [];
  }
}
