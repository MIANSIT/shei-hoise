-- Switching an order's Delivery Courier must never silently destroy the
-- previous courier's shipment record (tracking id, status, cost details) —
-- production data, needed for disputes/reconciliation across many stores.
-- Every time the active shipment fields get cleared for a courier switch,
-- they're archived here first instead of being lost.
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "courier_shipment_history" "jsonb" DEFAULT '[]'::jsonb;
