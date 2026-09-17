-- Store-level SEO override fields, separate from the customer-facing
-- description shown on the storefront. A shop's best "About us" copy isn't
-- always its best search-result copy, so store owners get a distinct
-- title/description they can target at what shoppers actually search for
-- (mirrors products.meta_title / products.meta_description).
--
-- Both nullable — generateMetadata() in [store_slug]/layout.tsx already
-- falls back to store_name / description when these are unset, so every
-- existing store renders exactly as it does today until an owner fills
-- these in.

ALTER TABLE "public"."stores"
  ADD COLUMN IF NOT EXISTS "seo_title" character varying(70),
  ADD COLUMN IF NOT EXISTS "seo_description" character varying(200);
