-- Receive stock once, and the supplier bill writes itself.
--
-- A purchase is one delivery from one supplier: its lines (product, quantity,
-- unit cost on the supplier's bill), a bill number and a due date. Receiving
-- it, in ONE transaction:
--   1. adds the stock (branch stock when a branch is given)
--   2. updates each product's cost to the weighted average
--        new cost = (units in stock x current cost + units received x unit cost)
--                   / (units in stock + units received)
--   3. adds the supplier bill (supplier_ledger kind 'bill'), linked to the purchase
--   4. adds a payment too when some was paid now, linked to the purchase
-- so stock, cost, bill and payment can never disagree.
--
-- Accounts payable (what the store owes suppliers) is still supplier_ledger:
-- bills minus payments. Nothing about existing bills changes; they simply have
-- no purchase behind them ("legacy" bills).
--
-- Additive: new tables, new nullable columns, one new function. Existing code
-- keeps working untouched. Apply this BEFORE deploying the code that uses it.
--
-- Requires 20261101000000_add_suppliers.sql, 20261103000000_add_supplier_ledger.sql,
-- 20261105000000_money_paid_from.sql and 20261002000000_add_store_branches.sql.
-- Writes go through supabaseAdmin in permission-checked server actions
-- (stock.edit + stock.supplier_money); the SELECT policies let only the store
-- owner read rows directly, like supplier_ledger.

-- 1. Purchases ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL,
    "supplier_id" uuid NOT NULL REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT,
    "bill_no" text,
    "purchase_date" date NOT NULL,
    "due_date" date,
    "status" text DEFAULT 'received' NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "note" text,
    "attachment_url" text,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "received_at" timestamp with time zone,
    CONSTRAINT "purchases_status_check" CHECK ("status" IN ('draft', 'ordered', 'received', 'cancelled')),
    CONSTRAINT "purchases_total_check" CHECK ("total" >= 0)
);
ALTER TABLE "public"."purchases" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "purchases_store_date_idx" ON "public"."purchases" ("store_id", "purchase_date" DESC);
CREATE INDEX IF NOT EXISTS "purchases_supplier_idx" ON "public"."purchases" ("supplier_id", "purchase_date" DESC);
-- The same supplier bill number twice is almost always a double entry; the app warns, the database blocks.
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_supplier_bill_no_uidx"
  ON "public"."purchases" ("store_id", "supplier_id", lower("bill_no"))
  WHERE "bill_no" IS NOT NULL AND "status" <> 'cancelled';

CREATE TABLE IF NOT EXISTS "public"."purchase_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "purchase_id" uuid NOT NULL REFERENCES "public"."purchases"("id") ON DELETE CASCADE,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT,
    "variant_id" uuid REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT,
    "product_name" text,
    "variant_name" text,
    "quantity_ordered" integer DEFAULT 0 NOT NULL,
    "quantity_received" integer DEFAULT 0 NOT NULL,
    "unit_cost" numeric(12,2) NOT NULL,
    "cost_before" numeric(12,2),
    "cost_after" numeric(12,2),
    CONSTRAINT "purchase_items_qty_check" CHECK ("quantity_ordered" >= 0 AND "quantity_received" >= 0),
    CONSTRAINT "purchase_items_cost_check" CHECK ("unit_cost" >= 0)
);
ALTER TABLE "public"."purchase_items" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "purchase_items_purchase_idx" ON "public"."purchase_items" ("purchase_id");
CREATE INDEX IF NOT EXISTS "purchase_items_product_idx" ON "public"."purchase_items" ("product_id");

GRANT ALL ON TABLE "public"."purchases" TO "service_role";
GRANT ALL ON TABLE "public"."purchase_items" TO "service_role";
GRANT SELECT ON TABLE "public"."purchases" TO "authenticated";
GRANT SELECT ON TABLE "public"."purchase_items" TO "authenticated";

ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."purchase_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases_owner_select" ON "public"."purchases";
CREATE POLICY "purchases_owner_select" ON "public"."purchases" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "purchases"."store_id" AND u."user_type" = 'store_owner'
  )
);
DROP POLICY IF EXISTS "purchase_items_owner_select" ON "public"."purchase_items";
CREATE POLICY "purchase_items_owner_select" ON "public"."purchase_items" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "purchase_items"."store_id" AND u."user_type" = 'store_owner'
  )
);

-- 2. Links from the existing tables (all optional) ---------------------------
ALTER TABLE "public"."suppliers"
  ADD COLUMN IF NOT EXISTS "payment_terms_days" integer;

ALTER TABLE "public"."supplier_ledger"
  ADD COLUMN IF NOT EXISTS "purchase_id" uuid REFERENCES "public"."purchases"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "supplier_ledger_purchase_idx"
  ON "public"."supplier_ledger" ("purchase_id") WHERE "purchase_id" IS NOT NULL;

ALTER TABLE "public"."stock_movements"
  ADD COLUMN IF NOT EXISTS "purchase_id" uuid REFERENCES "public"."purchases"("id") ON DELETE SET NULL;

-- 3. Receive a purchase ------------------------------------------------------
-- p_items: [{"product_id": uuid, "variant_id": uuid|null, "quantity": int > 0, "unit_cost": number >= 0}]
-- Returns {"purchase_id", "total", "bill_amount", "paid_amount"}.
-- Called only by the server action after it has checked the caller's permissions.
CREATE OR REPLACE FUNCTION "public"."receive_purchase"(
    "p_store_id" "uuid",
    "p_supplier_id" "uuid",
    "p_branch_id" "uuid",
    "p_bill_no" "text",
    "p_purchase_date" "date",
    "p_due_date" "date",
    "p_note" "text",
    "p_attachment_url" "text",
    "p_items" "jsonb",
    "p_paid_amount" numeric,
    "p_payment_method" "text",
    "p_paid_from" "text",
    "p_created_by" "uuid"
) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_purchase_id uuid := gen_random_uuid();
  v_total numeric := 0;
  v_paid numeric := GREATEST(COALESCE(p_paid_amount, 0), 0);
  v_has_branches boolean;
  v_bill_no text := NULLIF(btrim(COALESCE(p_bill_no, '')), '');
  it record;
  v_product_name text;
  v_variant_name text;
  v_stock integer;
  v_cost numeric;
  v_new_cost numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one product';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = p_store_id) INTO v_has_branches;
  IF v_has_branches AND p_branch_id IS NULL THEN
    RAISE EXCEPTION 'Choose which branch received the stock';
  END IF;
  IF p_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.store_branches WHERE id = p_branch_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  FOR it IN
    SELECT (x ->> 'product_id')::uuid AS product_id,
           NULLIF(x ->> 'variant_id', '')::uuid AS variant_id,
           (x ->> 'quantity')::integer AS quantity,
           (x ->> 'unit_cost')::numeric AS unit_cost
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    IF it.quantity IS NULL OR it.quantity <= 0 THEN
      RAISE EXCEPTION 'Every product needs a quantity above zero';
    END IF;
    IF it.unit_cost IS NULL OR it.unit_cost < 0 THEN
      RAISE EXCEPTION 'Every product needs a cost per unit';
    END IF;
    v_total := v_total + round(it.quantity * it.unit_cost, 2);
  END LOOP;
  v_total := round(v_total, 2);

  IF v_paid > v_total THEN
    RAISE EXCEPTION 'Paid now is more than the bill total';
  END IF;
  IF v_paid > 0 AND p_paid_from IS DISTINCT FROM 'outside' AND v_has_branches AND p_branch_id IS NULL THEN
    RAISE EXCEPTION 'Choose which branch the money was paid from';
  END IF;

  INSERT INTO public.purchases
    (id, store_id, branch_id, supplier_id, bill_no, purchase_date, due_date, status, total, note, attachment_url, created_by, received_at)
  VALUES
    (v_purchase_id, p_store_id, p_branch_id, p_supplier_id, v_bill_no, p_purchase_date, p_due_date, 'received', v_total,
     NULLIF(btrim(COALESCE(p_note, '')), ''), p_attachment_url, p_created_by, now());

  FOR it IN
    SELECT (x ->> 'product_id')::uuid AS product_id,
           NULLIF(x ->> 'variant_id', '')::uuid AS variant_id,
           (x ->> 'quantity')::integer AS quantity,
           (x ->> 'unit_cost')::numeric AS unit_cost
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    SELECT p.name INTO v_product_name FROM public.products p WHERE p.id = it.product_id AND p.store_id = p_store_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product does not belong to this store';
    END IF;
    v_variant_name := NULL;
    IF it.variant_id IS NOT NULL THEN
      SELECT v.variant_name INTO v_variant_name
      FROM public.product_variants v WHERE v.id = it.variant_id AND v.product_id = it.product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant does not belong to this product';
      END IF;
    END IF;

    -- Units in stock and cost BEFORE this delivery (store-wide; branch stock is part of it).
    SELECT COALESCE(pi.quantity_available, 0) INTO v_stock
    FROM public.product_inventory pi
    WHERE pi.product_id = it.product_id AND pi.variant_id IS NOT DISTINCT FROM it.variant_id
    FOR UPDATE;
    IF NOT FOUND THEN
      v_stock := 0;
    END IF;

    IF it.variant_id IS NOT NULL THEN
      SELECT COALESCE(v.tp_price, p.tp_price) INTO v_cost
      FROM public.product_variants v JOIN public.products p ON p.id = v.product_id
      WHERE v.id = it.variant_id;
    ELSE
      SELECT p.tp_price INTO v_cost FROM public.products p WHERE p.id = it.product_id;
    END IF;

    -- Weighted average. With no stock or no known cost, the new cost is simply this delivery's.
    IF v_stock > 0 AND COALESCE(v_cost, 0) > 0 THEN
      v_new_cost := round((v_stock * v_cost + it.quantity * it.unit_cost) / (v_stock + it.quantity), 2);
    ELSE
      v_new_cost := round(it.unit_cost, 2);
    END IF;

    -- Add the stock through the same locked, logged functions the stock pages use.
    IF p_branch_id IS NOT NULL THEN
      PERFORM public.adjust_branch_inventory(
        p_branch_id, it.product_id, it.variant_id, it.quantity, 'purchase',
        'Purchase' || COALESCE(' ' || v_bill_no, ''), p_created_by, p_store_id);
    ELSE
      PERFORM public.adjust_inventory(
        it.product_id, it.variant_id, it.quantity, 'purchase',
        'Purchase' || COALESCE(' ' || v_bill_no, ''), p_created_by, p_store_id);
    END IF;

    UPDATE public.stock_movements
       SET purchase_id = v_purchase_id
     WHERE purchase_id IS NULL
       AND reason = 'purchase'
       AND product_id = it.product_id
       AND variant_id IS NOT DISTINCT FROM it.variant_id
       AND created_at = now();

    IF it.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET tp_price = v_new_cost WHERE id = it.variant_id;
    ELSE
      UPDATE public.products SET tp_price = v_new_cost WHERE id = it.product_id;
    END IF;

    INSERT INTO public.purchase_items
      (purchase_id, store_id, product_id, variant_id, product_name, variant_name,
       quantity_ordered, quantity_received, unit_cost, cost_before, cost_after)
    VALUES
      (v_purchase_id, p_store_id, it.product_id, it.variant_id, v_product_name, v_variant_name,
       it.quantity, it.quantity, round(it.unit_cost, 2), v_cost, v_new_cost);
  END LOOP;

  -- The bill. Free goods (total 0) make no bill.
  IF v_total > 0 THEN
    INSERT INTO public.supplier_ledger
      (store_id, supplier_id, kind, amount, entry_date, note, created_by, purchase_id)
    VALUES
      (p_store_id, p_supplier_id, 'bill', v_total, p_purchase_date,
       'Purchase' || COALESCE(' ' || v_bill_no, ''), p_created_by, v_purchase_id);
  END IF;

  -- Paid now: a payment against the same purchase.
  IF v_paid > 0 THEN
    INSERT INTO public.supplier_ledger
      (store_id, supplier_id, kind, amount, entry_date, payment_method, note, created_by, purchase_id, paid_from, branch_id)
    VALUES
      (p_store_id, p_supplier_id, 'payment', v_paid, p_purchase_date, COALESCE(NULLIF(p_payment_method, ''), 'cash'),
       'Paid with purchase' || COALESCE(' ' || v_bill_no, ''), p_created_by, v_purchase_id,
       COALESCE(p_paid_from, 'shop'),
       CASE WHEN COALESCE(p_paid_from, 'shop') = 'shop' THEN p_branch_id ELSE NULL END);
  END IF;

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'total', v_total,
    'bill_amount', CASE WHEN v_total > 0 THEN v_total ELSE 0 END,
    'paid_amount', v_paid
  );
END;
$$;
ALTER FUNCTION "public"."receive_purchase"("uuid", "uuid", "uuid", "text", "date", "date", "text", "text", "jsonb", numeric, "text", "text", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."receive_purchase"("uuid", "uuid", "uuid", "text", "date", "date", "text", "text", "jsonb", numeric, "text", "text", "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."receive_purchase"("uuid", "uuid", "uuid", "text", "date", "date", "text", "text", "jsonb", numeric, "text", "text", "uuid") TO "service_role";
