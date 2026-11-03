-- Locking a closed month.
--
-- Closing a month (period_closes, migration 20261120) saves a copy of its Profit & Loss
-- and balance. This migration makes the month stay that way: once it is closed, money
-- records dated in it cannot be added, changed or deleted until the owner reopens the
-- month (which deletes the saved copy and lifts the lock).
--
-- What is locked (a row dated inside a closed month, for that branch, or for any branch
-- when the whole store was closed):
--   expenses, supplier bills and payments (supplier_ledger), purchases (Receive Stock),
--   Money Book entries, customer payments, customer refunds, owner withdrawals, COD
--   settlements, vendor payments, vendor settlements and vendor orders;
--   orders: adding or deleting one dated in the month, changing its date or branch, its
--   amounts (subtotal, discount, extra charges, total) or moving it in or out of
--   cancelled/returned; and every change to its item lines.
-- What is NOT locked, on purpose: an order's payment status, courier, delivery status
--   and notes, the courier's delivery cost, stock movements, and anything dated after
--   the month (so a payment received today for an old order is fine: it is dated today).
--
-- A new storefront order is never blocked: its date is the UTC date, which can be one day
-- behind Dhaka just after midnight, so an order is only treated as back-dated when its date
-- is more than one day before today in Dhaka.
--
-- A store that never closes a month has no rows in period_closes, so nothing changes for it.
-- Additive: functions and triggers only, no table or column changes.
--
-- Requires 20261120000000_add_period_closes.sql.

-- True when the date falls in a month the owner has closed for this store and branch.
-- SECURITY DEFINER so the check also works for browser users, who cannot read period_closes.
CREATE OR REPLACE FUNCTION "public"."is_period_closed"(
    "p_store_id" uuid,
    "p_branch_id" uuid,
    "p_date" date
) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p_store_id IS NOT NULL
     AND p_date IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.period_closes pc
       WHERE pc.store_id = p_store_id
         AND p_date BETWEEN pc.period_start AND pc.period_end
         AND (pc.branch_id IS NULL OR pc.branch_id = p_branch_id)
     );
$$;
ALTER FUNCTION "public"."is_period_closed"(uuid, uuid, date) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."is_period_closed"(uuid, uuid, date) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."is_period_closed"(uuid, uuid, date) TO "authenticated", "service_role";

-- Raises the error shown to the person trying to change a closed month.
CREATE OR REPLACE FUNCTION "public"."raise_period_closed"("p_date" date) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'The month of % is closed, so this cannot be added, changed or deleted. Reopen the month on the Balance Sheet page first.',
    to_char(p_date, 'FMMonth YYYY')
    USING ERRCODE = 'P0001';
END;
$$;
ALTER FUNCTION "public"."raise_period_closed"(date) OWNER TO "postgres";

-- Generic lock for tables with a store_id, an optional branch_id and one date column
-- (its name is the trigger argument).
CREATE OR REPLACE FUNCTION "public"."enforce_closed_period"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_col text := TG_ARGV[0];
  v_row jsonb;
  v_date date;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_row := to_jsonb(OLD);
    -- Deleting a whole store removes its rows one by one: that is not an edit of a closed month.
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (v_row ->> 'store_id')::uuid) THEN
      RETURN OLD;
    END IF;
    v_date := NULLIF(v_row ->> v_col, '')::date;
    IF public.is_period_closed((v_row ->> 'store_id')::uuid, NULLIF(v_row ->> 'branch_id', '')::uuid, v_date) THEN
      PERFORM public.raise_period_closed(v_date);
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_row := to_jsonb(NEW);
    v_date := NULLIF(v_row ->> v_col, '')::date;
    IF public.is_period_closed((v_row ->> 'store_id')::uuid, NULLIF(v_row ->> 'branch_id', '')::uuid, v_date) THEN
      PERFORM public.raise_period_closed(v_date);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."enforce_closed_period"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."expenses";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."expenses"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('expense_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."supplier_ledger";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."supplier_ledger"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('entry_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."purchases";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."purchases"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('purchase_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."money_entries";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."money_entries"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('entry_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."customer_payments";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."customer_payments"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('payment_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."customer_refunds";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."customer_refunds"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('refund_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."owner_withdrawals";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."owner_withdrawals"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('withdrawal_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."store_cod_settlements";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."store_cod_settlements"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('settlement_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."vendor_payments";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."vendor_payments"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('payment_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."vendor_settlements";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."vendor_settlements"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('settlement_date');

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."vendor_orders";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."vendor_orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"('order_date');

-- Orders: the amounts and the date of an order in a closed month are fixed; its payment
-- status, courier and delivery status are not (see the top of this file).
CREATE OR REPLACE FUNCTION "public"."enforce_closed_period_orders"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only an order back-dated by the shop; a fresh storefront order can carry yesterday's UTC date.
    IF NEW.order_date < v_today - 1 AND public.is_period_closed(NEW.store_id, NEW.branch_id, NEW.order_date) THEN
      PERFORM public.raise_period_closed(NEW.order_date);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Deleting a whole store removes its orders one by one: that is not an edit of a closed month.
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = OLD.store_id) THEN
      RETURN OLD;
    END IF;
    IF public.is_period_closed(OLD.store_id, OLD.branch_id, OLD.order_date) THEN
      PERFORM public.raise_period_closed(OLD.order_date);
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF public.is_period_closed(OLD.store_id, OLD.branch_id, OLD.order_date)
     OR public.is_period_closed(NEW.store_id, NEW.branch_id, NEW.order_date) THEN
    IF NEW.order_date IS DISTINCT FROM OLD.order_date
       OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.additional_charges IS DISTINCT FROM OLD.additional_charges
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR (OLD.status IN ('cancelled', 'returned')) IS DISTINCT FROM (NEW.status IN ('cancelled', 'returned')) THEN
      PERFORM public.raise_period_closed(OLD.order_date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."enforce_closed_period_orders"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."orders";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period_orders"();

-- Item lines follow their order: no change to the lines of an order in a closed month.
CREATE OR REPLACE FUNCTION "public"."enforce_closed_period_order_items"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order record;
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
  -- OLD and NEW are only read in the operations that have them.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.order_id IS NOT NULL THEN
      SELECT store_id, branch_id, order_date INTO v_order FROM public.orders WHERE id = OLD.order_id;
      IF FOUND AND public.is_period_closed(v_order.store_id, v_order.branch_id, v_order.order_date) THEN
        PERFORM public.raise_period_closed(v_order.order_date);
      END IF;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.order_id IS NOT NULL THEN
      SELECT store_id, branch_id, order_date INTO v_order FROM public.orders WHERE id = NEW.order_id;
      -- A line added while an order is being created (a fresh order) is never blocked, same as the order itself.
      IF FOUND AND v_order.order_date < v_today - 1
         AND public.is_period_closed(v_order.store_id, v_order.branch_id, v_order.order_date) THEN
        PERFORM public.raise_period_closed(v_order.order_date);
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."enforce_closed_period_order_items"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."order_items";
CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."order_items"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period_order_items"();
