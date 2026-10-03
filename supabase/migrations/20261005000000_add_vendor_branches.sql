-- Branch Hubs: vendor distribution by branch.
--
-- Goods sent to a vendor leave one branch's shelf (the branch the order was
-- confirmed from), returns from a settlement go back to the branch that
-- recorded it, and cancelling an order puts the goods back where they came
-- from. Vendor money (upfront payments, settlement payments) is credited to
-- that same branch, so the vendor profit share lands in the right branch.
--
-- The existing vendor functions are left exactly as they are. Each gets a
-- small *_at_branch wrapper that checks the branch has the stock, then runs
-- the original with a transaction-local setting (app.inventory_branch) that
-- tells the product_inventory → branch sync and the money-branch trigger
-- which branch to use instead of spreading by priority. Stores without
-- branches go straight through to the original function.
--
-- Requires 20261002000000, 20261003000000 and 20261004000000.

-- 1. Columns -----------------------------------------------------------------
ALTER TABLE "public"."vendor_orders"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;
ALTER TABLE "public"."vendor_settlements"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;

-- Confirmed orders and past settlements of stores that already have branches
-- came out of (went back to) the default branch first.
UPDATE public.vendor_orders vo
   SET branch_id = public.default_store_branch(vo.store_id)
 WHERE vo.branch_id IS NULL AND vo.status <> 'draft'
   AND EXISTS (SELECT 1 FROM public.store_branches b WHERE b.store_id = vo.store_id);
UPDATE public.vendor_settlements vs
   SET branch_id = public.default_store_branch(vs.store_id)
 WHERE vs.branch_id IS NULL
   AND EXISTS (SELECT 1 FROM public.store_branches b WHERE b.store_id = vs.store_id);

-- 2. The branch an inventory change belongs to -------------------------------
-- Set with set_config('app.inventory_branch', <id>, true) — local to the
-- transaction, so it never leaks into another request. Empty = not set.
CREATE OR REPLACE FUNCTION "public"."inventory_branch_target"("p_store_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_raw text := NULLIF(current_setting('app.inventory_branch', true), '');
  v_id uuid;
BEGIN
  IF v_raw IS NULL THEN
    RETURN NULL;
  END IF;
  v_id := v_raw::uuid;
  -- Only a branch of this store counts.
  IF EXISTS (SELECT 1 FROM public.store_branches WHERE id = v_id AND store_id = p_store_id) THEN
    RETURN v_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Same as 20261002000000, plus: when a target branch is set, the whole
-- change goes to that branch instead of being spread by priority.
CREATE OR REPLACE FUNCTION "public"."trg_product_inventory_to_branches"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
  v_target uuid;
BEGIN
  IF public.branch_sync_active() THEN
    RETURN NEW;
  END IF;

  SELECT store_id INTO v_store_id FROM public.products WHERE id = NEW.product_id;
  IF v_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = v_store_id) THEN
    RETURN NEW;
  END IF;

  v_target := public.inventory_branch_target(v_store_id);

  PERFORM public.branch_sync_set(true);
  IF TG_OP = 'INSERT' THEN
    -- A product created after branches were turned on starts in the default branch.
    PERFORM public.branch_inventory_add(
      v_store_id, COALESCE(v_target, public.default_store_branch(v_store_id)), NEW.product_id, NEW.variant_id,
      COALESCE(NEW.quantity_available, 0), COALESCE(NEW.quantity_reserved, 0));
  ELSIF v_target IS NOT NULL THEN
    PERFORM public.branch_inventory_add(
      v_store_id, v_target, NEW.product_id, NEW.variant_id,
      COALESCE(NEW.quantity_available, 0) - COALESCE(OLD.quantity_available, 0),
      COALESCE(NEW.quantity_reserved, 0) - COALESCE(OLD.quantity_reserved, 0));
  ELSE
    PERFORM public.spread_inventory_delta(
      v_store_id, NEW.product_id, NEW.variant_id,
      COALESCE(NEW.quantity_available, 0) - COALESCE(OLD.quantity_available, 0),
      COALESCE(NEW.quantity_reserved, 0) - COALESCE(OLD.quantity_reserved, 0));
  END IF;
  PERFORM public.branch_sync_set(false);
  RETURN NEW;
END;
$$;

-- Same as 20261004000000, plus: a money row written while a target branch is
-- set (a vendor's upfront or settlement payment) goes to that branch.
CREATE OR REPLACE FUNCTION "public"."trg_fill_money_branch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order_branch uuid;
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = NEW.branch_id AND store_id = NEW.store_id) THEN
      RAISE EXCEPTION 'That branch belongs to another store';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'customer_payments' AND NEW.order_id IS NOT NULL THEN
    SELECT branch_id INTO v_order_branch FROM public.orders WHERE id = NEW.order_id;
    NEW.branch_id := v_order_branch;
  END IF;

  IF NEW.branch_id IS NULL THEN
    NEW.branch_id := COALESCE(public.inventory_branch_target(NEW.store_id), public.default_store_branch(NEW.store_id));
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Stock check -------------------------------------------------------------
-- p_items: [{"product_id", "variant_id" ("" or null for none), "quantity"}].
-- Raises when the branch doesn't have enough of a line.
CREATE OR REPLACE FUNCTION "public"."check_branch_stock"("p_branch_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    WITH items AS (
      SELECT (e->>'product_id')::uuid AS pid,
             NULLIF(e->>'variant_id', '')::uuid AS vid,
             GREATEST(COALESCE((e->>'quantity')::int, 0), 0) AS qty
      FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) e
    ),
    needs AS (
      SELECT pid, vid, SUM(qty)::int AS qty FROM items GROUP BY pid, vid
    )
    SELECT n.qty, COALESCE(bi.quantity_available, 0) AS have, p.name AS product_name, sb.name AS branch_name
    FROM needs n
    JOIN public.products p ON p.id = n.pid
    JOIN public.store_branches sb ON sb.id = p_branch_id
    LEFT JOIN public.branch_inventory bi
      ON bi.branch_id = p_branch_id AND bi.product_id = n.pid AND bi.variant_id IS NOT DISTINCT FROM n.vid
    WHERE n.qty > COALESCE(bi.quantity_available, 0)
    LIMIT 1
  LOOP
    RAISE EXCEPTION 'Not enough % in % (has %, needs %). Transfer stock there first or pick another branch.',
      r.product_name, r.branch_name, r.have, r.qty;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."set_inventory_branch"("p_branch_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  SELECT set_config('app.inventory_branch', COALESCE(p_branch_id::text, ''), true);
$$;

-- 4. Wrappers ----------------------------------------------------------------
-- Confirm: goods leave p_branch_id (default branch when null).
CREATE OR REPLACE FUNCTION "public"."confirm_vendor_order_at_branch"(
    "p_vendor_order_id" "uuid",
    "p_branch_id" "uuid" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store uuid;
  v_branch uuid;
  v_items jsonb;
BEGIN
  SELECT store_id INTO v_store FROM public.vendor_orders WHERE id = p_vendor_order_id;
  IF v_store IS NULL THEN
    RAISE EXCEPTION 'Vendor order not found';
  END IF;
  IF p_caller_store_id IS NOT NULL AND v_store <> p_caller_store_id THEN
    RAISE EXCEPTION 'Vendor order not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = v_store) THEN
    v_branch := COALESCE(p_branch_id, public.default_store_branch(v_store));
    IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = v_branch AND store_id = v_store AND is_active) THEN
      RAISE EXCEPTION 'Choose an active branch';
    END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('product_id', product_id, 'variant_id', variant_id, 'quantity', quantity)), '[]'::jsonb)
      INTO v_items
    FROM public.vendor_order_items WHERE vendor_order_id = p_vendor_order_id;
    PERFORM public.check_branch_stock(v_branch, v_items);
    UPDATE public.vendor_orders SET branch_id = v_branch WHERE id = p_vendor_order_id;
    PERFORM public.set_inventory_branch(v_branch);
  END IF;

  PERFORM public.confirm_vendor_order(p_vendor_order_id, p_created_by, p_caller_store_id);
  PERFORM public.set_inventory_branch(NULL);
END;
$$;

-- More items on a confirmed order: from the order's own branch.
CREATE OR REPLACE FUNCTION "public"."add_items_to_confirmed_vendor_order_at_branch"(
    "p_vendor_order_id" "uuid",
    "p_items" "jsonb",
    "p_created_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store uuid;
  v_branch uuid;
BEGIN
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.vendor_orders WHERE id = p_vendor_order_id;
  IF v_store IS NULL OR (p_caller_store_id IS NOT NULL AND v_store <> p_caller_store_id) THEN
    RAISE EXCEPTION 'Vendor order not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = v_store) THEN
    IF v_branch IS NULL THEN
      v_branch := public.default_store_branch(v_store);
      UPDATE public.vendor_orders SET branch_id = v_branch WHERE id = p_vendor_order_id;
    END IF;
    PERFORM public.check_branch_stock(v_branch, p_items);
    PERFORM public.set_inventory_branch(v_branch);
  END IF;

  PERFORM public.add_items_to_confirmed_vendor_order(p_vendor_order_id, p_items, p_created_by, p_caller_store_id);
  PERFORM public.set_inventory_branch(NULL);
END;
$$;

-- Cancel: goods go back to the branch they came from.
CREATE OR REPLACE FUNCTION "public"."cancel_vendor_order_at_branch"(
    "p_vendor_order_id" "uuid",
    "p_cancelled_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch uuid;
BEGIN
  SELECT branch_id INTO v_branch FROM public.vendor_orders WHERE id = p_vendor_order_id;
  PERFORM public.set_inventory_branch(v_branch);
  PERFORM public.cancel_vendor_order(p_vendor_order_id, p_cancelled_by, p_caller_store_id);
  PERFORM public.set_inventory_branch(NULL);
END;
$$;

-- Settlement: returned goods (and the payment) land in p_branch_id.
CREATE OR REPLACE FUNCTION "public"."record_vendor_settlement_at_branch"(
    "p_vendor_id" "uuid",
    "p_store_id" "uuid",
    "p_settlement_date" "date",
    "p_items" "jsonb",
    "p_payment_amount" numeric DEFAULT 0,
    "p_notes" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_payment_method" character varying DEFAULT 'cash',
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch uuid;
  v_settlement uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = p_store_id) THEN
    v_branch := COALESCE(p_branch_id, public.default_store_branch(p_store_id));
    IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = v_branch AND store_id = p_store_id) THEN
      RAISE EXCEPTION 'Choose a branch of this store';
    END IF;
    PERFORM public.set_inventory_branch(v_branch);
  END IF;

  v_settlement := public.record_vendor_settlement(
    p_vendor_id, p_store_id, p_settlement_date, p_items, p_payment_amount, p_notes, p_created_by, p_payment_method);

  IF v_branch IS NOT NULL THEN
    UPDATE public.vendor_settlements SET branch_id = v_branch WHERE id = v_settlement;
  END IF;
  PERFORM public.set_inventory_branch(NULL);
  RETURN v_settlement;
END;
$$;

-- Deleting a settlement takes its returns back out of the branch they went to.
CREATE OR REPLACE FUNCTION "public"."delete_vendor_settlement_at_branch"(
    "p_settlement_id" "uuid",
    "p_caller_store_id" "uuid" DEFAULT NULL,
    "p_deleted_by" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch uuid;
BEGIN
  SELECT branch_id INTO v_branch FROM public.vendor_settlements WHERE id = p_settlement_id;
  PERFORM public.set_inventory_branch(v_branch);
  PERFORM public.delete_vendor_settlement(p_settlement_id, p_caller_store_id, p_deleted_by);
  PERFORM public.set_inventory_branch(NULL);
END;
$$;

-- 5. Grants: server code only (service role), like the originals ------------
REVOKE ALL ON FUNCTION "public"."check_branch_stock"("uuid", "jsonb") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."set_inventory_branch"("uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."confirm_vendor_order_at_branch"("uuid", "uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."add_items_to_confirmed_vendor_order_at_branch"("uuid", "jsonb", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."cancel_vendor_order_at_branch"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."record_vendor_settlement_at_branch"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying, "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."delete_vendor_settlement_at_branch"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."check_branch_stock"("uuid", "jsonb") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."set_inventory_branch"("uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."confirm_vendor_order_at_branch"("uuid", "uuid", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."add_items_to_confirmed_vendor_order_at_branch"("uuid", "jsonb", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."cancel_vendor_order_at_branch"("uuid", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."record_vendor_settlement_at_branch"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying, "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."delete_vendor_settlement_at_branch"("uuid", "uuid", "uuid") TO "service_role";
