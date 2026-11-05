-- Every sold order line keeps the cost (TP) it was sold at, whichever way the order was made.
--
-- 1. When an order line is saved with no cost (null or 0), the database fills it in from the variant's TP, or the
--    product's TP, at that moment. Admin screens and the storefront already send a cost; this covers every other
--    path (imports, bulk tools, future code). It never replaces a cost that is already there, and it leaves the
--    line empty when there is no TP anywhere, so the profit warning still counts it.
--
-- 2. When a TP is added to a product or variant that had none, order lines of that product that were sold with no
--    cost get that TP. It fills in missing costs only (never changes one that exists), skips closed months, and
--    never blocks saving the TP: any problem is only a warning. The line then uses the TP given today, which is
--    closer than counting it as free but is not the price paid back then.
--
-- Additive: functions and triggers only. Requires the order_items table; the closed-month check is used when
-- 20261121000000_lock_closed_months.sql is applied.

CREATE OR REPLACE FUNCTION "public"."fill_order_item_cost"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF COALESCE(NEW.cost_price, 0) = 0 THEN
    NEW.cost_price := COALESCE(
      (SELECT NULLIF(v.tp_price, 0) FROM public.product_variants v WHERE v.id = NEW.variant_id),
      (SELECT NULLIF(p.tp_price, 0) FROM public.products p WHERE p.id = NEW.product_id),
      NEW.cost_price
    );
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."fill_order_item_cost"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_fill_order_item_cost" ON "public"."order_items";
CREATE TRIGGER "trg_fill_order_item_cost" BEFORE INSERT ON "public"."order_items"
  FOR EACH ROW EXECUTE FUNCTION "public"."fill_order_item_cost"();

-- A TP added to a product with no TP fills the lines of that product with no variant.
CREATE OR REPLACE FUNCTION "public"."backfill_order_costs_from_product"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF COALESCE(NEW.tp_price, 0) > 0 AND COALESCE(OLD.tp_price, 0) = 0 THEN
    BEGIN
      UPDATE public.order_items oi
         SET cost_price = NEW.tp_price
        FROM public.orders o
       WHERE oi.order_id = o.id
         AND oi.product_id = NEW.id
         AND oi.variant_id IS NULL
         AND COALESCE(oi.cost_price, 0) = 0
         AND NOT public.is_period_closed(o.store_id, o.branch_id, o.order_date);
    EXCEPTION WHEN OTHERS THEN
      -- The TP itself must always save; the cost of old lines can be set by hand instead.
      RAISE WARNING 'Could not fill the cost of old order lines for product %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."backfill_order_costs_from_product"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_backfill_order_costs" ON "public"."products";
CREATE TRIGGER "trg_backfill_order_costs" AFTER UPDATE OF "tp_price" ON "public"."products"
  FOR EACH ROW EXECUTE FUNCTION "public"."backfill_order_costs_from_product"();

-- A TP added to a variant with no TP fills the lines of that variant.
CREATE OR REPLACE FUNCTION "public"."backfill_order_costs_from_variant"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF COALESCE(NEW.tp_price, 0) > 0 AND COALESCE(OLD.tp_price, 0) = 0 THEN
    BEGIN
      UPDATE public.order_items oi
         SET cost_price = NEW.tp_price
        FROM public.orders o
       WHERE oi.order_id = o.id
         AND oi.variant_id = NEW.id
         AND COALESCE(oi.cost_price, 0) = 0
         AND NOT public.is_period_closed(o.store_id, o.branch_id, o.order_date);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not fill the cost of old order lines for variant %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."backfill_order_costs_from_variant"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_backfill_order_costs" ON "public"."product_variants";
CREATE TRIGGER "trg_backfill_order_costs" AFTER UPDATE OF "tp_price" ON "public"."product_variants"
  FOR EACH ROW EXECUTE FUNCTION "public"."backfill_order_costs_from_variant"();
