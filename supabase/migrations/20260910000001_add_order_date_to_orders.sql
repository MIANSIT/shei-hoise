-- Lets an admin record/backdate "when this order actually happened" separate
-- from created_at (when the row was written) — same purpose as the existing
-- vendor_orders.order_date, needed here for backfilling historical/manual
-- orders. Day granularity only, matching vendor_orders.order_date.
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "order_date" date;

-- Backfill existing rows to the same calendar day their created_at already
-- gets bucketed into everywhere else (recompute_dashboard_daily_metrics uses
-- the same AT TIME ZONE 'Asia/Dhaka' conversion).
UPDATE "public"."orders"
  SET "order_date" = (created_at AT TIME ZONE 'Asia/Dhaka')::date
  WHERE "order_date" IS NULL;

-- New inserts that don't explicitly set order_date (checkout, Quick Sale)
-- get today automatically.
ALTER TABLE "public"."orders" ALTER COLUMN "order_date" SET DEFAULT CURRENT_DATE;
ALTER TABLE "public"."orders" ALTER COLUMN "order_date" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "orders_order_date_idx" ON "public"."orders" ("store_id", "order_date" DESC);
