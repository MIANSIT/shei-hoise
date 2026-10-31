-- Expense categories get an accounting kind, so buying stock stops being
-- counted as a cost of this period's sales.
--
-- Why: a shop that logs restocking under a "Product Purchase" expense category
-- had that cash subtracted from profit twice — once as the expense, and again
-- as the cost of goods when those same items sold. Buying stock is not an
-- expense at all: it turns cash into stock (an asset), and only becomes a cost
-- through COGS on the day it sells. Owner profit share / drawings are not an
-- expense either — they are a split of profit already earned.
--
--   'operating'  → a real running cost of the period: ads, rent, packaging,
--                  salary, delivery shortfall, fees. These are the only ones
--                  the Profit & Loss ("Sales") view subtracts.
--   'inventory'  → money spent buying stock. Cash out and stock in; never P&L.
--                  Belongs on the Accounts view with supplier payments.
--   'owner_draw' → profit share, owner's drawings. Not a business cost.
--
-- Additive and idempotent: existing rows default to 'operating', so code that
-- predates this column keeps behaving exactly as before.

ALTER TABLE "public"."expense_categories"
  ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'operating' NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_categories_kind_check'
  ) THEN
    ALTER TABLE "public"."expense_categories"
      ADD CONSTRAINT "expense_categories_kind_check"
      CHECK ("kind" IN ('operating', 'inventory', 'owner_draw'));
  END IF;
END $$;

COMMENT ON COLUMN "public"."expense_categories"."kind" IS
  'operating = a running cost, subtracted in Profit & Loss; inventory = stock buying, cash out only; owner_draw = profit share / drawings, never a cost.';

-- Backfill by name, for every store's existing categories. Matches the English
-- defaults (see 20260719000002_seed_default_expense_categories.sql and
-- defaultExpenseCategories.ts), the names stores have actually created
-- ("Product RePurchase", "Profit Share"), and the Bengali equivalents.
-- Only rows still on the default are touched, so a kind set by hand survives
-- a re-run.
UPDATE "public"."expense_categories"
SET "kind" = 'inventory'
WHERE "kind" = 'operating'
  AND (
    "name" ~* '(product|stock|inventory|goods)\s*(re)?\s*purchase'
    OR "name" ~* '(re)?purchas(e|ing)\s*(of)?\s*(product|stock|goods)'
    OR "name" ~* '^(re)?stock(ing)?$'
    OR "name" ~* '(buying|buy)\s*stock'
    OR "name" LIKE '%পণ্য ক্রয়%'
    OR "name" LIKE '%মাল ক্রয়%'
    OR "name" LIKE '%স্টক ক্রয়%'
  );

UPDATE "public"."expense_categories"
SET "kind" = 'owner_draw'
WHERE "kind" = 'operating'
  AND (
    "name" ~* 'profit\s*share'
    OR "name" ~* 'owner''?s?\s*(draw|drawing|withdraw)'
    OR "name" ~* '^(draw|drawings|withdrawal)s?$'
    OR "name" LIKE '%লভ্যাংশ%'
    OR "name" LIKE '%মুনাফা%'
  );
