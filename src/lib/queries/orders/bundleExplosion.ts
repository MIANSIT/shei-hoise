"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { OrderProduct } from "../../types/order";
import { bundleItemKey } from "./bundleItemKey";

export interface BundleExplosionResult {
  /** Non-bundle-header items whose stock actually needs checking/reserving: original simple lines + this order's bundle components. */
  stockRelevantItems: OrderProduct[];
  /** Component purchases for each bundle line, keyed by the header's own (product_id, variant_id) — looked up once the header's real order_items id is known. */
  componentsByHeaderKey: Map<string, OrderProduct[]>;
}

/**
 * Resolves which order lines are bundles and expands each into its
 * component purchases (quantity_needed × line quantity), so the rest of the
 * order pipeline (stock validation/reservation, status-change handlers)
 * never has to know bundles exist — it just sees ordinary product lines.
 * Component unit_price/total_price are 0 — the bundle's own header line
 * already carries the money; components exist purely for stock + display.
 */
export async function explodeBundleOrderProducts(
  orderProducts: OrderProduct[]
): Promise<BundleExplosionResult> {
  const productIds = [...new Set(orderProducts.map((i) => i.product_id))];
  const { data: productRows, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, product_type")
    .in("id", productIds);
  if (productError) throw new Error(productError.message);

  const productTypeMap = new Map(
    (productRows ?? []).map((p) => [p.id, p.product_type])
  );

  const bundleLines = orderProducts.filter(
    (item) => productTypeMap.get(item.product_id) === "bundle"
  );
  const simpleLines = orderProducts.filter(
    (item) => productTypeMap.get(item.product_id) !== "bundle"
  );

  const componentsByHeaderKey = new Map<string, OrderProduct[]>();
  const explodedComponents: OrderProduct[] = [];

  if (bundleLines.length > 0) {
    const bundleIds = bundleLines.map((i) => i.product_id);
    const { data: recipeRows, error: recipeError } = await supabaseAdmin
      .from("bundle_items")
      .select(
        "id, bundle_product_id, component_product_id, component_variant_id, quantity_needed, option_group_id"
      )
      .in("bundle_product_id", bundleIds);
    if (recipeError) throw new Error(recipeError.message);

    const componentProductIds = [
      ...new Set((recipeRows ?? []).map((r) => r.component_product_id)),
    ];
    const componentVariantIds = [
      ...new Set(
        (recipeRows ?? [])
          .map((r) => r.component_variant_id)
          .filter((id): id is string => !!id)
      ),
    ];

    const [{ data: componentProducts }, { data: componentVariants }] =
      await Promise.all([
        componentProductIds.length
          ? supabaseAdmin
              .from("products")
              .select("id, name, tp_price")
              .in("id", componentProductIds)
          : Promise.resolve({
              data: [] as { id: string; name: string; tp_price: number | null }[],
            }),
        componentVariantIds.length
          ? supabaseAdmin
              .from("product_variants")
              .select("id, variant_name, tp_price")
              .in("id", componentVariantIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                variant_name: string;
                tp_price: number | null;
              }[],
            }),
      ]);

    const productMap = new Map((componentProducts ?? []).map((p) => [p.id, p]));
    const variantMap = new Map((componentVariants ?? []).map((v) => [v.id, v]));

    const recipeByBundle = new Map<string, NonNullable<typeof recipeRows>>();
    for (const row of recipeRows ?? []) {
      const list = recipeByBundle.get(row.bundle_product_id) ?? [];
      list.push(row);
      recipeByBundle.set(row.bundle_product_id, list);
    }

    for (const line of bundleLines) {
      const recipe = recipeByBundle.get(line.product_id) ?? [];

      // Rows sharing an option_group_id are alternatives for one slot — the
      // customer's pick (carried on the cart/order line) decides which one
      // actually ships. Ungrouped rows are fixed, unchanged from before.
      const ungrouped = recipe.filter((r) => !r.option_group_id);
      const groups = new Map<string, typeof recipe>();
      for (const r of recipe) {
        if (!r.option_group_id) continue;
        const list = groups.get(r.option_group_id) ?? [];
        list.push(r);
        groups.set(r.option_group_id, list);
      }

      const resolvedRecipe = [...ungrouped];
      for (const [groupId, options] of groups) {
        const pickedId = line.bundle_selections?.[groupId];
        const picked = pickedId ? options.find((o) => o.id === pickedId) : undefined;
        if (!picked) {
          throw new Error(
            `Bundle "${line.product_name}" requires a selection for one of its options`
          );
        }
        resolvedRecipe.push(picked);
      }

      const components: OrderProduct[] = resolvedRecipe.map((r) => {
        const product = productMap.get(r.component_product_id);
        const variant = r.component_variant_id
          ? variantMap.get(r.component_variant_id)
          : undefined;

        return {
          product_id: r.component_product_id,
          variant_id: r.component_variant_id || undefined,
          product_name: variant
            ? `${product?.name ?? "Component"} - ${variant.variant_name}`
            : product?.name ?? "Component",
          quantity: r.quantity_needed * line.quantity,
          unit_price: 0,
          total_price: 0,
          cost_price: variant?.tp_price ?? product?.tp_price ?? null,
        };
      });
      componentsByHeaderKey.set(
        bundleItemKey(line.product_id, line.variant_id),
        components
      );
      explodedComponents.push(...components);
    }
  }

  return {
    stockRelevantItems: [...simpleLines, ...explodedComponents],
    componentsByHeaderKey,
  };
}
