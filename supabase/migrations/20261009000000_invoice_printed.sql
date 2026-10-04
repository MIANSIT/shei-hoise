-- Remember when an order's invoice was last printed or downloaded, so the
-- order list can show "Printed" and filter to the ones not printed yet
-- (e.g. today's confirmed orders, without yesterday's already-printed ones).
-- Set by markInvoicesPrinted() whenever an invoice or receipt is printed,
-- downloaded as PDF, or included in a bulk invoice download.

ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "invoice_printed_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "orders_store_invoice_printed_idx"
  ON "public"."orders" ("store_id", "invoice_printed_at");
