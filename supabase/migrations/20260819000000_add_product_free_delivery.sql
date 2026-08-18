-- Per-product free delivery.
-- When any product in a cart has this on, the whole order ships free at
-- checkout, regardless of how many items or which shipping option is picked.
ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "free_delivery" boolean DEFAULT false NOT NULL;
