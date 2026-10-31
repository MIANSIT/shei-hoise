-- Lets a shop keep a category out of the storefront's browsing (the shop's
-- category filter, the home page category circles and the sitemap) without
-- switching it off. "Active" keeps its meaning: an inactive category is hidden
-- from the store as before. show_in_store = false is for a category used only
-- behind the scenes, for example to group products for member discounts: it
-- stays active, products can be filed in it and they still sell everywhere.
--
-- Additive, default true: every existing category behaves exactly as before.
-- Apply this BEFORE deploying the code that saves it (creating or editing a
-- category writes the column).
ALTER TABLE "public"."categories"
  ADD COLUMN IF NOT EXISTS "show_in_store" boolean DEFAULT true NOT NULL;
