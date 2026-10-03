-- Branch Hubs, phase 2: every order belongs to one branch.
--
-- The branch is chosen when the order is created (see pickOrderBranch in
-- src/lib/queries/orders/orderStock.ts): the dashboard's selected branch for
-- admin / Quick Sale orders, otherwise the first branch (by priority) that has
-- EVERY item in stock. Its stock is reserved, released and finalized in that
-- branch's row through order_stock_move() below — one row-locked function
-- that replaces the read-then-write inventory updates the order code did
-- before. Stores without branches keep working on product_inventory exactly
-- as before.
--
-- Requires 20261002000000_add_store_branches.sql.

-- 1. Columns -----------------------------------------------------------------
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;
-- No branch had every item when the order came in; someone has to move stock or pick a branch.
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "needs_transfer" boolean DEFAULT false NOT NULL;
-- false = the branch was picked automatically and is waiting for a person to
-- confirm it (assignment mode "confirm"); shown in the Unassigned tab.
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "branch_confirmed" boolean DEFAULT true NOT NULL;
CREATE INDEX IF NOT EXISTS "orders_branch_id_idx" ON "public"."orders" ("branch_id");

-- How online orders get their branch: 'auto' takes the top suggestion,
-- 'confirm' still reserves stock there but waits for a person to confirm.
ALTER TABLE "public"."stores" ADD COLUMN IF NOT EXISTS "branch_assignment_mode" "text" DEFAULT 'auto' NOT NULL;
DO $$ BEGIN
  ALTER TABLE "public"."stores" ADD CONSTRAINT "stores_branch_assignment_mode_check"
    CHECK ("branch_assignment_mode" = ANY (ARRAY['auto'::"text", 'confirm'::"text"]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Backfill: orders of stores that already turned branches on belong to the
--    default branch (where their stock went when branches were turned on).
UPDATE "public"."orders" o
   SET "branch_id" = public.default_store_branch(o.store_id)
 WHERE o.branch_id IS NULL
   AND EXISTS (SELECT 1 FROM public.store_branches b WHERE b.store_id = o.store_id);

-- Turning branches on later does the same backfill.
CREATE OR REPLACE FUNCTION "public"."enable_store_branches"("p_store_id" "uuid", "p_name" "text", "p_code" "text" DEFAULT NULL) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('enable_branches_' || p_store_id::text));
  IF EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = p_store_id) THEN
    RAISE EXCEPTION 'Branches are already turned on for this store';
  END IF;

  INSERT INTO public.store_branches (store_id, name, code, priority)
  VALUES (p_store_id, p_name, NULLIF(p_code, ''), 1)
  RETURNING id INTO v_branch_id;

  PERFORM public.branch_sync_set(true);
  INSERT INTO public.branch_inventory
    (store_id, branch_id, product_id, variant_id, quantity_available, quantity_reserved, low_stock_threshold)
  SELECT p_store_id, v_branch_id, pi.product_id, pi.variant_id,
         COALESCE(pi.quantity_available, 0), COALESCE(pi.quantity_reserved, 0), COALESCE(pi.low_stock_threshold, 5)
  FROM public.product_inventory pi
  JOIN public.products p ON p.id = pi.product_id
  WHERE p.store_id = p_store_id AND pi.product_id IS NOT NULL;
  PERFORM public.branch_sync_set(false);

  UPDATE public.orders SET branch_id = v_branch_id WHERE store_id = p_store_id AND branch_id IS NULL;

  RETURN v_branch_id;
END;
$$;

-- 3. One locked stock move for an order line ---------------------------------
--   reserve   q>0: available −q (floored at 0), reserved +q
--             q<0: the reverse (cancel / quantity lowered)
--   take      q>0: available −q (floored at 0); q<0 puts stock back
--             (delivered orders: nothing is reserved any more)
--   finalize  q>0: reserved −q (floored at 0) — delivered, the stock has left
-- p_branch_id NULL acts on product_inventory (stores without branches, or
-- orders from before branches); otherwise on that branch's row, whose sync
-- trigger keeps the store total right.
CREATE OR REPLACE FUNCTION "public"."stock_move"(
    "p_store_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_variant_id" "uuid",
    "p_op" "text", "p_qty" integer
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_a integer;
  v_r integer;
  v_new_a integer;
  v_new_r integer;
BEGIN
  IF p_qty IS NULL OR p_qty = 0 THEN
    RETURN;
  END IF;
  IF p_op NOT IN ('reserve', 'take', 'finalize') THEN
    RAISE EXCEPTION 'Unknown stock operation %', p_op;
  END IF;
  -- Bundle headers hold no stock; their component lines carry it.
  IF EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND product_type = 'bundle') THEN
    RETURN;
  END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT quantity_available, quantity_reserved INTO v_a, v_r FROM public.branch_inventory
     WHERE branch_id = p_branch_id AND product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      PERFORM public.branch_inventory_add(p_store_id, p_branch_id, p_product_id, p_variant_id, 0, 0);
      v_a := 0;
      v_r := 0;
    END IF;
  ELSE
    SELECT quantity_available, COALESCE(quantity_reserved, 0) INTO v_a, v_r FROM public.product_inventory
     WHERE product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN;
    END IF;
  END IF;

  v_new_a := v_a;
  v_new_r := v_r;
  IF p_op = 'reserve' THEN
    v_new_a := GREATEST(0, v_a - p_qty);
    v_new_r := GREATEST(0, v_r + p_qty);
  ELSIF p_op = 'take' THEN
    v_new_a := GREATEST(0, v_a - p_qty);
  ELSE
    v_new_r := GREATEST(0, v_r - p_qty);
  END IF;

  IF p_branch_id IS NOT NULL THEN
    UPDATE public.branch_inventory
       SET quantity_available = v_new_a, quantity_reserved = v_new_r, updated_at = now()
     WHERE branch_id = p_branch_id AND product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id;
  ELSE
    UPDATE public.product_inventory
       SET quantity_available = v_new_a, quantity_reserved = v_new_r, updated_at = now()
     WHERE product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id;
  END IF;
END;
$$;

-- The same, on whichever branch the order belongs to.
CREATE OR REPLACE FUNCTION "public"."order_stock_move"(
    "p_order_id" "uuid", "p_product_id" "uuid", "p_variant_id" "uuid", "p_op" "text", "p_qty" integer
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch uuid;
  v_store uuid;
BEGIN
  SELECT o.branch_id, o.store_id INTO v_branch, v_store FROM public.orders o WHERE o.id = p_order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  PERFORM public.stock_move(v_store, v_branch, p_product_id, p_variant_id, p_op, p_qty);
END;
$$;

-- 4. Which branches can fulfil a set of items --------------------------------
-- p_items: [{"product_id": "...", "variant_id": "..." | null, "quantity": 2}, ...]
-- (bundles already exploded into components). One row per active branch,
-- best first: branches that have everything (by priority), then the rest by
-- how many lines they cover.
CREATE OR REPLACE FUNCTION "public"."suggest_order_branches"("p_store_id" "uuid", "p_items" "jsonb")
RETURNS TABLE(
    "branch_id" "uuid", "branch_name" "text", "priority" integer,
    "can_fulfil" boolean, "covered_lines" integer, "total_lines" integer, "missing" "jsonb"
)
    LANGUAGE "sql" STABLE
    AS $$
  WITH items AS (
    SELECT (e->>'product_id')::uuid AS pid,
           NULLIF(e->>'variant_id', '')::uuid AS vid,
           GREATEST(COALESCE((e->>'quantity')::int, 0), 0) AS qty
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) e
  ),
  needs AS (
    SELECT i.pid, i.vid, SUM(i.qty)::int AS qty
    FROM items i
    JOIN public.products p ON p.id = i.pid AND p.store_id = p_store_id AND p.product_type <> 'bundle'
    GROUP BY i.pid, i.vid
  ),
  per_branch AS (
    SELECT b.id, b.name, b.priority, n.pid, n.vid, n.qty,
           COALESCE(bi.quantity_available, 0) AS have
    FROM public.store_branches b
    CROSS JOIN needs n
    LEFT JOIN public.branch_inventory bi
      ON bi.branch_id = b.id AND bi.product_id = n.pid AND bi.variant_id IS NOT DISTINCT FROM n.vid
    WHERE b.store_id = p_store_id AND b.is_active
  )
  SELECT id, name, priority,
         bool_and(have >= qty) AS can_fulfil,
         (COUNT(*) FILTER (WHERE have >= qty))::int AS covered_lines,
         COUNT(*)::int AS total_lines,
         COALESCE(
           jsonb_agg(jsonb_build_object('product_id', pid, 'variant_id', vid, 'need', qty, 'have', have))
             FILTER (WHERE have < qty),
           '[]'::jsonb
         ) AS missing
  FROM per_branch
  GROUP BY id, name, priority
  ORDER BY bool_and(have >= qty) DESC, COUNT(*) FILTER (WHERE have >= qty) DESC, priority ASC;
$$;

-- 5. Moving an order to another branch ---------------------------------------
-- Allowed until it ships. The reservation moves in one transaction; the new
-- branch must have every item.
CREATE OR REPLACE FUNCTION "public"."move_order_to_branch"("p_order_id" "uuid", "p_branch_id" "uuid", "p_caller_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  o record;
  i record;
  v_have integer;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF o.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Only pending or confirmed orders can move to another branch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = p_branch_id AND store_id = p_caller_store_id AND is_active) THEN
    RAISE EXCEPTION 'Choose an active branch';
  END IF;

  IF o.branch_id IS NOT DISTINCT FROM p_branch_id THEN
    UPDATE public.orders SET branch_confirmed = true, updated_at = now() WHERE id = o.id;
    RETURN;
  END IF;

  -- Check first, so a shortfall leaves everything untouched.
  FOR i IN
    SELECT oi.product_id, oi.variant_id, SUM(oi.quantity)::int AS qty, MAX(oi.product_name) AS name
    FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = o.id AND p.product_type <> 'bundle'
    GROUP BY oi.product_id, oi.variant_id
  LOOP
    SELECT quantity_available INTO v_have FROM public.branch_inventory
     WHERE branch_id = p_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
     FOR UPDATE;
    IF COALESCE(v_have, 0) < i.qty THEN
      RAISE EXCEPTION 'Not enough % in that branch (has %, order needs %)', COALESCE(i.name, 'stock'), COALESCE(v_have, 0), i.qty;
    END IF;
  END LOOP;

  FOR i IN
    SELECT oi.product_id, oi.variant_id, SUM(oi.quantity)::int AS qty
    FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = o.id AND p.product_type <> 'bundle'
    GROUP BY oi.product_id, oi.variant_id
  LOOP
    -- release from the old branch (or the store total for an order without one) …
    PERFORM public.stock_move(o.store_id, o.branch_id, i.product_id, i.variant_id, 'reserve', -i.qty);
    -- … and hold it in the new one
    PERFORM public.stock_move(o.store_id, p_branch_id, i.product_id, i.variant_id, 'reserve', i.qty);
  END LOOP;

  UPDATE public.orders
     SET branch_id = p_branch_id, branch_confirmed = true, needs_transfer = false, updated_at = now()
   WHERE id = o.id;
END;
$$;

-- 6. Reading branch stock from the dashboard --------------------------------
-- The product pickers in Quick Sale and Create Order read stock with the
-- signed-in user's client, so they need a read policy: the owner, or staff
-- who can see stock or sell.
DROP POLICY IF EXISTS "branch_inventory_staff_select" ON "public"."branch_inventory";
CREATE POLICY "branch_inventory_staff_select" ON "public"."branch_inventory" FOR SELECT TO "authenticated" USING (
  "public"."has_store_permission"("store_id", 'stock.view')
  OR "public"."has_store_permission"("store_id", 'products.view')
  OR "public"."has_store_permission"("store_id", 'pos.add')
  OR "public"."has_store_permission"("store_id", 'orders.add')
);
GRANT SELECT ON TABLE "public"."branch_inventory" TO "authenticated";

REVOKE ALL ON FUNCTION "public"."stock_move"("uuid", "uuid", "uuid", "uuid", "text", integer) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."order_stock_move"("uuid", "uuid", "uuid", "text", integer) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."suggest_order_branches"("uuid", "jsonb") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."move_order_to_branch"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."stock_move"("uuid", "uuid", "uuid", "uuid", "text", integer) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."order_stock_move"("uuid", "uuid", "uuid", "text", integer) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."suggest_order_branches"("uuid", "jsonb") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."move_order_to_branch"("uuid", "uuid", "uuid") TO "service_role";
