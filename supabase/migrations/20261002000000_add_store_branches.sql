-- Branch Hubs, phase 1: branches and per-branch stock (plan feature key:
-- multi_branch, plan limit key: max_branches).
--
-- One brand (the store) over equal branches ordered by priority. Stock is
-- kept per branch in branch_inventory; product_inventory stays the
-- store-wide total that ~50 readers (storefront, cart, feed, stock table)
-- already use, kept in sync by triggers in BOTH directions:
--
--   branch_inventory  ──(sum of active branches)──▶  product_inventory
--   product_inventory ──(delta spread over branches)──▶  branch_inventory
--
-- The second direction is what lets every existing writer of
-- product_inventory (order reserve/release/finalize, vendor stock-out, the
-- legacy adjust_inventory/set_inventory RPCs, createInventory) keep working
-- unchanged once a store turns branches on: a decrease is taken from
-- branches in priority order, an increase lands in the priority-1 branch.
-- Phase 2 makes orders pick their branch explicitly.
--
-- A store with no store_branches rows is untouched by all of this.
-- Everything here is service-role only (RLS on, no policies); the app reads
-- and writes through "use server" actions that check permissions first.

-- 1. Branches ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."store_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL,
    "code" "text",
    -- 1 = first. Only a tie-breaker and a default (vendor stock-in, stock
    -- added through older code paths); gives no extra powers.
    "priority" integer NOT NULL,
    "address" "text",
    "phone" "text",
    -- Inactive: takes no new stock or orders, and its stock stops counting
    -- toward the storefront total.
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    -- Deferred so a reorder can swap priorities inside one transaction.
    CONSTRAINT "store_branches_store_priority_key" UNIQUE ("store_id", "priority") DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX IF NOT EXISTS "store_branches_store_name_key" ON "public"."store_branches" ("store_id", lower("name"));

-- 2. Stock per branch -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."branch_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" "uuid" NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "product_id" "uuid" NOT NULL REFERENCES "public"."products"("id") ON DELETE CASCADE,
    "variant_id" "uuid" REFERENCES "public"."product_variants"("id") ON DELETE CASCADE,
    -- No >= 0 check on purpose: stock taken through an older code path that
    -- the branches can't cover lands on the priority-1 branch even if that
    -- drives it negative, so the store total is never wrong.
    "quantity_available" integer DEFAULT 0 NOT NULL,
    "quantity_reserved" integer DEFAULT 0 NOT NULL,
    "low_stock_threshold" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
-- One row per branch × product × variant (variant may be NULL).
CREATE UNIQUE INDEX IF NOT EXISTS "branch_inventory_branch_product_variant_key"
  ON "public"."branch_inventory" ("branch_id", "product_id", COALESCE("variant_id", '00000000-0000-0000-0000-000000000000'::"uuid"));
CREATE INDEX IF NOT EXISTS "branch_inventory_product_idx" ON "public"."branch_inventory" ("product_id", "variant_id");
CREATE INDEX IF NOT EXISTS "branch_inventory_store_idx" ON "public"."branch_inventory" ("store_id");

-- 3. Transfers between branches --------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."branch_stock_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    -- "TR-0001", per store; set by trigger below.
    "transfer_number" "text" NOT NULL DEFAULT '',
    "from_branch_id" "uuid" NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE RESTRICT,
    "to_branch_id" "uuid" NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE RESTRICT,
    -- draft → sent (stock left the source, "in transit") → received; or cancelled
    "status" "text" DEFAULT 'draft' NOT NULL,
    "note" "text",
    "created_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "sent_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "received_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "sent_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "branch_stock_transfers_status_check" CHECK ("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'received'::"text", 'cancelled'::"text"])),
    CONSTRAINT "branch_stock_transfers_distinct_branches" CHECK ("from_branch_id" <> "to_branch_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "branch_stock_transfers_store_number_key" ON "public"."branch_stock_transfers" ("store_id", "transfer_number");
CREATE INDEX IF NOT EXISTS "branch_stock_transfers_store_created_idx" ON "public"."branch_stock_transfers" ("store_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "public"."branch_stock_transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "transfer_id" "uuid" NOT NULL REFERENCES "public"."branch_stock_transfers"("id") ON DELETE CASCADE,
    "product_id" "uuid" NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT,
    "variant_id" "uuid" REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT,
    "quantity" integer NOT NULL,
    -- Snapshots, so the transfer still reads correctly after a rename.
    "product_name" "text",
    "variant_name" "text",
    CONSTRAINT "branch_stock_transfer_items_quantity_check" CHECK ("quantity" > 0)
);
CREATE INDEX IF NOT EXISTS "branch_stock_transfer_items_transfer_idx" ON "public"."branch_stock_transfer_items" ("transfer_id");

CREATE OR REPLACE FUNCTION "public"."trg_branch_stock_transfer_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_next integer;
BEGIN
  IF NEW.transfer_number IS NOT NULL AND NEW.transfer_number <> '' THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('branch_transfer_' || NEW.store_id::text));
  SELECT COUNT(*) + 1 INTO v_next FROM public.branch_stock_transfers WHERE store_id = NEW.store_id;
  NEW.transfer_number := 'TR-' || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS "branch_stock_transfer_number" ON "public"."branch_stock_transfers";
CREATE TRIGGER "branch_stock_transfer_number" BEFORE INSERT ON "public"."branch_stock_transfers"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_branch_stock_transfer_number"();

-- 4. Stock history per branch ----------------------------------------------
ALTER TABLE "public"."stock_movements" ADD COLUMN IF NOT EXISTS "branch_id" "uuid";

-- 5. Two-way sync -----------------------------------------------------------
-- A transaction-local flag stops each direction from re-triggering the other.
-- VOLATILE on purpose: the flag changes inside a transaction and every
-- check must see the current value.
CREATE OR REPLACE FUNCTION "public"."branch_sync_active"() RETURNS boolean
    LANGUAGE "sql" VOLATILE
    AS $$ SELECT COALESCE(current_setting('app.branch_inventory_sync', true), '') = 'on'; $$;

CREATE OR REPLACE FUNCTION "public"."branch_sync_set"("p_on" boolean) RETURNS "void"
    LANGUAGE "sql"
    AS $$ SELECT set_config('app.branch_inventory_sync', CASE WHEN p_on THEN 'on' ELSE 'off' END, true); $$;

-- product_inventory := sum over the store's ACTIVE branches.
CREATE OR REPLACE FUNCTION "public"."recompute_product_inventory_total"("p_product_id" "uuid", "p_variant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_available integer;
  v_reserved integer;
  v_rows integer;
  v_was_on boolean := public.branch_sync_active();
BEGIN
  SELECT COALESCE(SUM(bi.quantity_available) FILTER (WHERE b.is_active), 0),
         COALESCE(SUM(bi.quantity_reserved) FILTER (WHERE b.is_active), 0),
         COUNT(*)
    INTO v_available, v_reserved, v_rows
  FROM public.branch_inventory bi
  JOIN public.store_branches b ON b.id = bi.branch_id
  WHERE bi.product_id = p_product_id
    AND bi.variant_id IS NOT DISTINCT FROM p_variant_id;

  PERFORM public.branch_sync_set(true);
  UPDATE public.product_inventory
     SET quantity_available = v_available, quantity_reserved = v_reserved, updated_at = now()
   WHERE product_id = p_product_id
     AND variant_id IS NOT DISTINCT FROM p_variant_id;
  -- Only (re)create a total row while branch rows still exist: when a
  -- product or variant is being deleted its branch rows cascade away, and
  -- re-inserting a total for it would point at a row that's going.
  IF NOT FOUND AND v_rows > 0
     AND EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id)
     AND (p_variant_id IS NULL OR EXISTS (SELECT 1 FROM public.product_variants WHERE id = p_variant_id)) THEN
    INSERT INTO public.product_inventory (product_id, variant_id, quantity_available, quantity_reserved)
    VALUES (p_product_id, p_variant_id, v_available, v_reserved);
  END IF;
  PERFORM public.branch_sync_set(v_was_on);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."trg_branch_inventory_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF public.branch_sync_active() THEN
    RETURN NULL;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recompute_product_inventory_total(OLD.product_id, OLD.variant_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW.product_id <> OLD.product_id OR NEW.variant_id IS DISTINCT FROM OLD.variant_id) THEN
    PERFORM public.recompute_product_inventory_total(NEW.product_id, NEW.variant_id);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS "branch_inventory_sync" ON "public"."branch_inventory";
CREATE TRIGGER "branch_inventory_sync" AFTER INSERT OR UPDATE OR DELETE ON "public"."branch_inventory"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_branch_inventory_sync"();

-- The branch a store's older code paths default to: first active by priority.
CREATE OR REPLACE FUNCTION "public"."default_store_branch"("p_store_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id FROM public.store_branches
  WHERE store_id = p_store_id
  ORDER BY is_active DESC, priority ASC
  LIMIT 1;
$$;

-- Adds to one branch row, creating it if needed. Caller holds the sync flag.
CREATE OR REPLACE FUNCTION "public"."branch_inventory_add"(
    "p_store_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_variant_id" "uuid",
    "p_available" integer, "p_reserved" integer
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.branch_inventory
     SET quantity_available = quantity_available + p_available,
         quantity_reserved = quantity_reserved + p_reserved,
         updated_at = now()
   WHERE branch_id = p_branch_id
     AND product_id = p_product_id
     AND variant_id IS NOT DISTINCT FROM p_variant_id;
  IF NOT FOUND THEN
    INSERT INTO public.branch_inventory (store_id, branch_id, product_id, variant_id, quantity_available, quantity_reserved)
    VALUES (p_store_id, p_branch_id, p_product_id, p_variant_id, p_available, p_reserved);
  END IF;
END;
$$;

-- Spreads a change made directly to product_inventory over the branches:
--   reserve (available −n, reserved +n)  → moves n from available to reserved,
--                                           branch by branch in priority order
--   release (available +n, reserved −n)  → moves reserved back to available
--   other decreases                      → taken from branches by priority
--   other increases                      → added to the default branch
-- Anything the branches can't cover lands on the default branch, so the
-- branch sum always equals the new total.
CREATE OR REPLACE FUNCTION "public"."spread_inventory_delta"(
    "p_store_id" "uuid", "p_product_id" "uuid", "p_variant_id" "uuid",
    "p_d_available" integer, "p_d_reserved" integer
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_default uuid := public.default_store_branch(p_store_id);
  v_remaining integer;
  v_take integer;
  r record;
BEGIN
  IF v_default IS NULL THEN
    RETURN;
  END IF;

  -- reserve: available → reserved
  IF p_d_available < 0 AND p_d_reserved = -p_d_available THEN
    v_remaining := p_d_reserved;
    FOR r IN
      SELECT bi.id, bi.quantity_available
      FROM public.branch_inventory bi JOIN public.store_branches b ON b.id = bi.branch_id
      WHERE bi.product_id = p_product_id AND bi.variant_id IS NOT DISTINCT FROM p_variant_id
        AND b.is_active AND bi.quantity_available > 0
      ORDER BY b.priority
      FOR UPDATE OF bi
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_take := LEAST(r.quantity_available, v_remaining);
      UPDATE public.branch_inventory
         SET quantity_available = quantity_available - v_take,
             quantity_reserved = quantity_reserved + v_take, updated_at = now()
       WHERE id = r.id;
      v_remaining := v_remaining - v_take;
    END LOOP;
    IF v_remaining > 0 THEN
      PERFORM public.branch_inventory_add(p_store_id, v_default, p_product_id, p_variant_id, -v_remaining, v_remaining);
    END IF;
    RETURN;
  END IF;

  -- release: reserved → available
  IF p_d_available > 0 AND p_d_reserved = -p_d_available THEN
    v_remaining := p_d_available;
    FOR r IN
      SELECT bi.id, bi.quantity_reserved
      FROM public.branch_inventory bi JOIN public.store_branches b ON b.id = bi.branch_id
      WHERE bi.product_id = p_product_id AND bi.variant_id IS NOT DISTINCT FROM p_variant_id
        AND b.is_active AND bi.quantity_reserved > 0
      ORDER BY b.priority
      FOR UPDATE OF bi
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_take := LEAST(r.quantity_reserved, v_remaining);
      UPDATE public.branch_inventory
         SET quantity_reserved = quantity_reserved - v_take,
             quantity_available = quantity_available + v_take, updated_at = now()
       WHERE id = r.id;
      v_remaining := v_remaining - v_take;
    END LOOP;
    IF v_remaining > 0 THEN
      PERFORM public.branch_inventory_add(p_store_id, v_default, p_product_id, p_variant_id, v_remaining, -v_remaining);
    END IF;
    RETURN;
  END IF;

  -- available, on its own
  IF p_d_available > 0 THEN
    PERFORM public.branch_inventory_add(p_store_id, v_default, p_product_id, p_variant_id, p_d_available, 0);
  ELSIF p_d_available < 0 THEN
    v_remaining := -p_d_available;
    FOR r IN
      SELECT bi.id, bi.quantity_available
      FROM public.branch_inventory bi JOIN public.store_branches b ON b.id = bi.branch_id
      WHERE bi.product_id = p_product_id AND bi.variant_id IS NOT DISTINCT FROM p_variant_id
        AND b.is_active AND bi.quantity_available > 0
      ORDER BY b.priority
      FOR UPDATE OF bi
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_take := LEAST(r.quantity_available, v_remaining);
      UPDATE public.branch_inventory
         SET quantity_available = quantity_available - v_take, updated_at = now()
       WHERE id = r.id;
      v_remaining := v_remaining - v_take;
    END LOOP;
    IF v_remaining > 0 THEN
      PERFORM public.branch_inventory_add(p_store_id, v_default, p_product_id, p_variant_id, -v_remaining, 0);
    END IF;
  END IF;

  -- reserved, on its own (e.g. order finalized: the hold is cleared)
  IF p_d_reserved > 0 THEN
    PERFORM public.branch_inventory_add(p_store_id, v_default, p_product_id, p_variant_id, 0, p_d_reserved);
  ELSIF p_d_reserved < 0 THEN
    v_remaining := -p_d_reserved;
    FOR r IN
      SELECT bi.id, bi.quantity_reserved
      FROM public.branch_inventory bi JOIN public.store_branches b ON b.id = bi.branch_id
      WHERE bi.product_id = p_product_id AND bi.variant_id IS NOT DISTINCT FROM p_variant_id
        AND b.is_active AND bi.quantity_reserved > 0
      ORDER BY b.priority
      FOR UPDATE OF bi
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_take := LEAST(r.quantity_reserved, v_remaining);
      UPDATE public.branch_inventory
         SET quantity_reserved = quantity_reserved - v_take, updated_at = now()
       WHERE id = r.id;
      v_remaining := v_remaining - v_take;
    END LOOP;
    IF v_remaining > 0 THEN
      PERFORM public.branch_inventory_add(p_store_id, v_default, p_product_id, p_variant_id, 0, -v_remaining);
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."trg_product_inventory_to_branches"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF public.branch_sync_active() THEN
    RETURN NEW;
  END IF;

  SELECT store_id INTO v_store_id FROM public.products WHERE id = NEW.product_id;
  IF v_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = v_store_id) THEN
    RETURN NEW;
  END IF;

  PERFORM public.branch_sync_set(true);
  IF TG_OP = 'INSERT' THEN
    -- A product created after branches were turned on starts in the default branch.
    PERFORM public.branch_inventory_add(
      v_store_id, public.default_store_branch(v_store_id), NEW.product_id, NEW.variant_id,
      COALESCE(NEW.quantity_available, 0), COALESCE(NEW.quantity_reserved, 0));
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
DROP TRIGGER IF EXISTS "product_inventory_to_branches_update" ON "public"."product_inventory";
CREATE TRIGGER "product_inventory_to_branches_update" BEFORE UPDATE OF "quantity_available", "quantity_reserved" ON "public"."product_inventory"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_product_inventory_to_branches"();
DROP TRIGGER IF EXISTS "product_inventory_to_branches_insert" ON "public"."product_inventory";
CREATE TRIGGER "product_inventory_to_branches_insert" AFTER INSERT ON "public"."product_inventory"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_product_inventory_to_branches"();

-- A branch switched on/off changes which stock counts toward the total.
CREATE OR REPLACE FUNCTION "public"."recompute_store_inventory_totals"("p_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT product_id, variant_id FROM public.branch_inventory WHERE store_id = p_store_id
  LOOP
    PERFORM public.recompute_product_inventory_total(r.product_id, r.variant_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."trg_store_branches_active_changed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    PERFORM public.recompute_store_inventory_totals(NEW.store_id);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS "store_branches_active_changed" ON "public"."store_branches";
CREATE TRIGGER "store_branches_active_changed" AFTER UPDATE OF "is_active" ON "public"."store_branches"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_store_branches_active_changed"();

-- 6. Turning branches on ----------------------------------------------------
-- Creates the first branch (priority 1) and puts every current stock row in
-- it, so totals are identical and nothing changes for customers on day one.
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

  RETURN v_branch_id;
END;
$$;

-- Priority = position in p_branch_ids (1-based). Unique key is deferred.
CREATE OR REPLACE FUNCTION "public"."reorder_store_branches"("p_store_id" "uuid", "p_branch_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.store_branches WHERE store_id = p_store_id) <> COALESCE(array_length(p_branch_ids, 1), 0)
     OR EXISTS (
       SELECT 1 FROM unnest(p_branch_ids) AS ids(id)
       WHERE NOT EXISTS (SELECT 1 FROM public.store_branches b WHERE b.id = ids.id AND b.store_id = p_store_id)
     ) THEN
    RAISE EXCEPTION 'The branch list does not match this store''s branches';
  END IF;

  UPDATE public.store_branches b
     SET priority = ord.position, updated_at = now()
    FROM unnest(p_branch_ids) WITH ORDINALITY AS ord(id, position)
   WHERE b.id = ord.id AND b.store_id = p_store_id;
END;
$$;

-- 7. Changing one branch's stock -------------------------------------------
CREATE OR REPLACE FUNCTION "public"."adjust_branch_inventory"(
    "p_branch_id" "uuid", "p_product_id" "uuid", "p_variant_id" "uuid", "p_delta" integer,
    "p_reason" character varying DEFAULT 'manual_adjustment', "p_note" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL, "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS TABLE("previous_quantity" integer, "new_quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = p_branch_id AND store_id = p_caller_store_id) THEN
    RAISE EXCEPTION 'Branch % does not belong to store %', p_branch_id, p_caller_store_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND store_id = p_caller_store_id) THEN
    RAISE EXCEPTION 'Product % does not belong to store %', p_product_id, p_caller_store_id;
  END IF;

  SELECT quantity_available INTO v_prev FROM public.branch_inventory
   WHERE branch_id = p_branch_id AND product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    v_prev := 0;
  END IF;

  v_new := v_prev + p_delta;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient stock in this branch: have %, requested change %', v_prev, p_delta;
  END IF;

  PERFORM public.branch_inventory_add(p_caller_store_id, p_branch_id, p_product_id, p_variant_id, p_delta, 0);

  INSERT INTO public.stock_movements
    (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_branch_id, p_delta, v_prev, v_new, COALESCE(p_reason, 'manual_adjustment'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, v_new;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."set_branch_inventory"(
    "p_branch_id" "uuid", "p_product_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer,
    "p_reason" character varying DEFAULT 'recount', "p_note" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL, "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS TABLE("previous_quantity" integer, "new_quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prev integer;
BEGIN
  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;
  SELECT quantity_available INTO v_prev FROM public.branch_inventory
   WHERE branch_id = p_branch_id AND product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id;
  RETURN QUERY SELECT * FROM public.adjust_branch_inventory(
    p_branch_id, p_product_id, p_variant_id, p_quantity - COALESCE(v_prev, 0),
    COALESCE(p_reason, 'recount'), p_note, p_created_by, p_caller_store_id);
END;
$$;

-- 8. Transfers --------------------------------------------------------------
-- Sending takes the stock out of the source branch (it's "in transit" and
-- counts nowhere); receiving adds it to the target; cancelling a sent
-- transfer puts it back in the source.
CREATE OR REPLACE FUNCTION "public"."send_branch_transfer"("p_transfer_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
BEGIN
  SELECT * INTO t FROM public.branch_stock_transfers
   WHERE id = p_transfer_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF t.status <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft transfer can be sent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.branch_stock_transfer_items WHERE transfer_id = t.id) THEN
    RAISE EXCEPTION 'Add at least one product before sending';
  END IF;

  FOR i IN SELECT * FROM public.branch_stock_transfer_items WHERE transfer_id = t.id LOOP
    SELECT quantity_available INTO v_have FROM public.branch_inventory
     WHERE branch_id = t.from_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
     FOR UPDATE;
    IF COALESCE(v_have, 0) < i.quantity THEN
      RAISE EXCEPTION 'Not enough stock to send % % (have %, sending %)',
        COALESCE(i.product_name, 'product'), COALESCE(i.variant_name, ''), COALESCE(v_have, 0), i.quantity;
    END IF;
    PERFORM public.branch_inventory_add(t.store_id, t.from_branch_id, i.product_id, i.variant_id, -i.quantity, 0);
    INSERT INTO public.stock_movements
      (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (i.product_id, i.variant_id, t.from_branch_id, -i.quantity, v_have, v_have - i.quantity, 'transfer_out', t.transfer_number, p_user_id);
  END LOOP;

  UPDATE public.branch_stock_transfers
     SET status = 'sent', sent_at = now(), sent_by = p_user_id, updated_at = now()
   WHERE id = t.id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."receive_branch_transfer"("p_transfer_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
BEGIN
  SELECT * INTO t FROM public.branch_stock_transfers
   WHERE id = p_transfer_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF t.status <> 'sent' THEN
    RAISE EXCEPTION 'Only a sent transfer can be received';
  END IF;

  FOR i IN SELECT * FROM public.branch_stock_transfer_items WHERE transfer_id = t.id LOOP
    SELECT quantity_available INTO v_have FROM public.branch_inventory
     WHERE branch_id = t.to_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
     FOR UPDATE;
    PERFORM public.branch_inventory_add(t.store_id, t.to_branch_id, i.product_id, i.variant_id, i.quantity, 0);
    INSERT INTO public.stock_movements
      (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (i.product_id, i.variant_id, t.to_branch_id, i.quantity, COALESCE(v_have, 0), COALESCE(v_have, 0) + i.quantity, 'transfer_in', t.transfer_number, p_user_id);
  END LOOP;

  UPDATE public.branch_stock_transfers
     SET status = 'received', received_at = now(), received_by = p_user_id, updated_at = now()
   WHERE id = t.id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."cancel_branch_transfer"("p_transfer_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
BEGIN
  SELECT * INTO t FROM public.branch_stock_transfers
   WHERE id = p_transfer_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF t.status NOT IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'This transfer can no longer be cancelled';
  END IF;

  IF t.status = 'sent' THEN
    FOR i IN SELECT * FROM public.branch_stock_transfer_items WHERE transfer_id = t.id LOOP
      SELECT quantity_available INTO v_have FROM public.branch_inventory
       WHERE branch_id = t.from_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
       FOR UPDATE;
      PERFORM public.branch_inventory_add(t.store_id, t.from_branch_id, i.product_id, i.variant_id, i.quantity, 0);
      INSERT INTO public.stock_movements
        (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
      VALUES
        (i.product_id, i.variant_id, t.from_branch_id, i.quantity, COALESCE(v_have, 0), COALESCE(v_have, 0) + i.quantity, 'transfer_cancel', t.transfer_number, p_user_id);
    END LOOP;
  END IF;

  UPDATE public.branch_stock_transfers
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = t.id;
END;
$$;

-- 9. Access: service role only ---------------------------------------------
ALTER TABLE "public"."store_branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."branch_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."branch_stock_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."branch_stock_transfer_items" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."store_branches" TO "service_role";
GRANT ALL ON TABLE "public"."branch_inventory" TO "service_role";
GRANT ALL ON TABLE "public"."branch_stock_transfers" TO "service_role";
GRANT ALL ON TABLE "public"."branch_stock_transfer_items" TO "service_role";

REVOKE ALL ON FUNCTION "public"."enable_store_branches"("uuid", "text", "text") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."reorder_store_branches"("uuid", "uuid"[]) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."adjust_branch_inventory"("uuid", "uuid", "uuid", integer, character varying, "text", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."set_branch_inventory"("uuid", "uuid", "uuid", integer, character varying, "text", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."send_branch_transfer"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."receive_branch_transfer"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."cancel_branch_transfer"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."enable_store_branches"("uuid", "text", "text") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."reorder_store_branches"("uuid", "uuid"[]) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."adjust_branch_inventory"("uuid", "uuid", "uuid", integer, character varying, "text", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."set_branch_inventory"("uuid", "uuid", "uuid", integer, character varying, "text", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."send_branch_transfer"("uuid", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."receive_branch_transfer"("uuid", "uuid", "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."cancel_branch_transfer"("uuid", "uuid", "uuid") TO "service_role";
