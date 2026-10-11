-- When an order became "paid".
--
-- A COD order marked Paid straight from the orders table (no courier
-- settlement) put its cash nowhere in Register Audit: COD orders are skipped
-- from the per-order "collected" fold-in, and with no settlement there was
-- nothing else to count. Register Audit needs the DAY the order was marked
-- paid, which no column held. A trigger keeps it right for every write path
-- (order table dropdown, bulk update, order page, customer dues).
--
-- Additive and idempotent. Old code ignores the column.

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;

COMMENT ON COLUMN "public"."orders"."paid_at" IS 'When payment_status last became paid; NULL while not paid. Register Audit uses it to count a COD order marked Paid without a courier settlement on the day it was marked.';

CREATE OR REPLACE FUNCTION "public"."set_orders_paid_at"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.payment_status = 'paid' THEN
    IF TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid' THEN
      NEW.paid_at := now();
    END IF;
  ELSE
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "orders_set_paid_at" ON "public"."orders";
CREATE TRIGGER "orders_set_paid_at"
  BEFORE INSERT OR UPDATE OF "payment_status" ON "public"."orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_orders_paid_at"();

-- Backfill only the rows Register Audit now reads: paid COD orders with no
-- settlement. updated_at is the best available guess for when they were marked.
UPDATE "public"."orders"
SET "paid_at" = "updated_at"
WHERE "paid_at" IS NULL
  AND "payment_status" = 'paid'
  AND "payment_method" = 'cod'
  AND "cod_settlement_id" IS NULL;

CREATE INDEX IF NOT EXISTS "orders_cod_paid_at_idx"
  ON "public"."orders" ("store_id", "paid_at")
  WHERE "payment_method" = 'cod' AND "cod_settlement_id" IS NULL;
