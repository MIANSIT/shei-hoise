-- Flash-sale scheduling: an optional time window around a product's (or
-- variant's) existing discounted_price, so a sale price can auto-activate
-- and auto-expire without an admin manually toggling discounted_price.
--
-- Both columns are nullable with no default. NULL/NULL must mean "always
-- active" -- identical to today's behavior -- so existing stores that
-- already have a discounted_price set are never silently un-discounted by
-- this migration. See src/lib/utils/getEffectivePrice.ts for the app-side
-- window check.

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "sale_starts_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "sale_ends_at" timestamp with time zone;

ALTER TABLE "public"."product_variants"
  ADD COLUMN IF NOT EXISTS "sale_starts_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "sale_ends_at" timestamp with time zone;
