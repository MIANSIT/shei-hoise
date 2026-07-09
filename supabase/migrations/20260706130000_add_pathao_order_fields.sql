-- Pathao Courier integration — per-order shipment tracking.
-- Safe to run multiple times (IF NOT EXISTS guards throughout).

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "pathao_consignment_id" "text",
  ADD COLUMN IF NOT EXISTS "pathao_order_status" character varying(50);
