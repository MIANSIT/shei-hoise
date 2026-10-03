-- Fix: trg_fill_money_branch read NEW.order_id on every table it runs on.
-- plpgsql doesn't short-circuit "TG_TABLE_NAME = ... AND NEW.order_id ...",
-- so a branchless insert into a table without order_id (register openings,
-- expenses, COD settlements, vendor payments) failed with
-- 'record "new" has no field "order_id"'. The order lookup is now nested so
-- the field is only touched for customer_payments. Otherwise identical to
-- 20261005000000.
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

  IF TG_TABLE_NAME = 'customer_payments' THEN
    IF NEW.order_id IS NOT NULL THEN
      SELECT branch_id INTO v_order_branch FROM public.orders WHERE id = NEW.order_id;
      NEW.branch_id := v_order_branch;
    END IF;
  END IF;

  IF NEW.branch_id IS NULL THEN
    NEW.branch_id := COALESCE(public.inventory_branch_target(NEW.store_id), public.default_store_branch(NEW.store_id));
  END IF;
  RETURN NEW;
END;
$$;
