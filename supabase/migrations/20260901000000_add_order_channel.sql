-- Distinguishes walk-in Quick Sale (POS) orders from regular online/storefront
-- orders so revenue reporting stays unified in one `orders` table instead of
-- a separate silo, while still being filterable/taggable in the UI.
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "channel" text NOT NULL DEFAULT 'online';

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_channel_check" CHECK ("channel" IN ('online', 'pos'));
