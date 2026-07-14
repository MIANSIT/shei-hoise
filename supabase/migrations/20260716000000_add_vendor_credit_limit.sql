-- Optional credit limit per vendor. 0 means "no limit" (the default) --
-- most vendors won't have one set, and dispatch should behave exactly as
-- it does today for them. When set, the vendor order create page warns
-- (soft block, owner can still confirm and proceed) once a vendor's
-- current due plus the new order would cross this amount.

ALTER TABLE "public"."vendors"
  ADD COLUMN IF NOT EXISTS "credit_limit" numeric(12,2) DEFAULT 0 NOT NULL;
