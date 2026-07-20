-- Inventory/alerts must stay live (unlike the daily money rollups in
-- 20260719000004) — there's no time dimension to a stock count, and a
-- customer who just bought the last unit needs staff to see that
-- immediately. Triggered directly on product_inventory because three-plus
-- order-flow files (orderService.ts, updateOrder.ts, updateOrderByNumber.ts,
-- bulkUpdateOrders.ts) write that table with plain .update() calls, not
-- through the adjust_inventory/set_inventory RPCs — a trigger on the table
-- itself is the only place that catches every writer. Also triggered on
-- products/product_variants price + is_active changes, since bucket
-- membership and total_inventory_value depend on those columns too and
-- would otherwise go stale on a price edit alone.
--
-- Replicates the exact bucket-priority logic from the client-side hook this
-- replaces (useDashboardMetrics.ts): a product lands in exactly one bucket
-- (fully out of stock > partially out of stock > low stock), variant-based
-- products are judged by their ACTIVE variants only (a product whose only
-- variants are inactive falls back to being judged as if it had none).

CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_inventory_summary"("p_store_id" "uuid") RETURNS void
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_in_stock_units integer := 0;
  v_low_stock_products integer := 0;
  v_out_of_stock_products integer := 0;
  v_partial_products integer := 0;
  v_inventory_value numeric(14,2) := 0;
  product_row RECORD;
  variant_row RECORD;
  simple_stock RECORD;
  v_has_active_variants boolean;
  v_any_stock boolean;
  v_any_oos boolean;
  v_any_low boolean;
BEGIN
  FOR product_row IN
    SELECT p.id, p.base_price, p.discounted_price
    FROM public.products p
    WHERE p.store_id = p_store_id
  LOOP
    v_has_active_variants := EXISTS (
      SELECT 1 FROM public.product_variants v
      WHERE v.product_id = product_row.id AND v.is_active IS NOT FALSE
    );

    IF v_has_active_variants THEN
      v_any_stock := false;
      v_any_oos := false;
      v_any_low := false;

      FOR variant_row IN
        SELECT pi.quantity_available, pi.low_stock_threshold, pi.track_inventory,
               COALESCE(NULLIF(v.discounted_price, 0), v.base_price) AS sell_price
        FROM public.product_variants v
        JOIN public.product_inventory pi ON pi.variant_id = v.id
        WHERE v.product_id = product_row.id AND v.is_active IS NOT FALSE
      LOOP
        IF NOT variant_row.track_inventory THEN
          CONTINUE;
        END IF;

        IF variant_row.quantity_available > 0 THEN
          v_any_stock := true;
          v_in_stock_units := v_in_stock_units + variant_row.quantity_available;
          v_inventory_value := v_inventory_value + variant_row.quantity_available * variant_row.sell_price;
          IF variant_row.quantity_available <= variant_row.low_stock_threshold THEN
            v_any_low := true;
          END IF;
        ELSE
          v_any_oos := true;
        END IF;
      END LOOP;

      IF NOT v_any_stock THEN
        v_out_of_stock_products := v_out_of_stock_products + 1;
      ELSIF v_any_oos THEN
        v_partial_products := v_partial_products + 1;
      ELSIF v_any_low THEN
        v_low_stock_products := v_low_stock_products + 1;
      END IF;
    ELSE
      SELECT pi.quantity_available, pi.low_stock_threshold, pi.track_inventory
        INTO simple_stock
      FROM public.product_inventory pi
      WHERE pi.product_id = product_row.id AND pi.variant_id IS NULL;

      IF FOUND AND simple_stock.track_inventory THEN
        IF simple_stock.quantity_available > 0 THEN
          v_in_stock_units := v_in_stock_units + simple_stock.quantity_available;
          v_inventory_value := v_inventory_value + simple_stock.quantity_available *
            COALESCE(NULLIF(product_row.discounted_price, 0), product_row.base_price);
          IF simple_stock.quantity_available <= simple_stock.low_stock_threshold THEN
            v_low_stock_products := v_low_stock_products + 1;
          END IF;
        ELSE
          v_out_of_stock_products := v_out_of_stock_products + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.dashboard_inventory_summary (
    store_id, in_stock_units, low_stock_product_count, out_of_stock_product_count,
    partially_out_of_stock_product_count, total_inventory_value, updated_at
  ) VALUES (
    p_store_id, v_in_stock_units, v_low_stock_products, v_out_of_stock_products,
    v_partial_products, v_inventory_value, now()
  )
  ON CONFLICT (store_id) DO UPDATE SET
    in_stock_units = EXCLUDED.in_stock_units,
    low_stock_product_count = EXCLUDED.low_stock_product_count,
    out_of_stock_product_count = EXCLUDED.out_of_stock_product_count,
    partially_out_of_stock_product_count = EXCLUDED.partially_out_of_stock_product_count,
    total_inventory_value = EXCLUDED.total_inventory_value,
    updated_at = now();
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_inventory_summary"("uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_inventory_summary"("uuid") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."trg_product_inventory_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id FROM public.products WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  IF v_store_id IS NOT NULL THEN
    PERFORM public.recompute_dashboard_inventory_summary(v_store_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trg_product_inventory_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "product_inventory_dashboard_recompute" ON "public"."product_inventory";
CREATE TRIGGER "product_inventory_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."product_inventory"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_product_inventory_dashboard"();

CREATE OR REPLACE FUNCTION "public"."trg_products_price_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.recompute_dashboard_inventory_summary(NEW.store_id);
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trg_products_price_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "products_price_dashboard_recompute" ON "public"."products";
CREATE TRIGGER "products_price_dashboard_recompute"
  AFTER UPDATE OF "base_price", "discounted_price", "discount_amount" ON "public"."products"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_products_price_dashboard"();

CREATE OR REPLACE FUNCTION "public"."trg_product_variants_price_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id FROM public.products WHERE id = NEW.product_id;
  IF v_store_id IS NOT NULL THEN
    PERFORM public.recompute_dashboard_inventory_summary(v_store_id);
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trg_product_variants_price_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "product_variants_price_dashboard_recompute" ON "public"."product_variants";
CREATE TRIGGER "product_variants_price_dashboard_recompute"
  AFTER UPDATE OF "base_price", "discounted_price", "discount_amount", "is_active" ON "public"."product_variants"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_product_variants_price_dashboard"();
