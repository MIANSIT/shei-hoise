-- A product can sit in several categories.
--
-- products.category_ids holds them all, main one first. products.category_id
-- stays as that main category (always category_ids[1]), so everything that
-- shows "the" category — cards, breadcrumbs, the product feed, exports — and
-- every existing `categories(...)` embed keeps working untouched.
--
-- An array instead of a product_categories join table on purpose: a join
-- table gives PostgREST a second products↔categories relationship, and every
-- existing `categories(...)` embed then fails as ambiguous the moment this
-- runs. Same pattern as membership_plan_benefits.category_ids.
--
-- Safe to apply before the code ships: old code that only writes category_id
-- is kept in sync by the trigger below.

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "category_ids" uuid[] DEFAULT '{}' NOT NULL;

-- Backfill before the trigger exists, so a stray legacy row can't abort it.
UPDATE "public"."products"
   SET "category_ids" = ARRAY["category_id"]
 WHERE "category_id" IS NOT NULL
   AND "category_ids" = '{}';

-- Shop/category filters: `category_ids && {…}` (overlaps) and `@>` (contains).
CREATE INDEX IF NOT EXISTS "products_category_ids_gin_idx"
  ON "public"."products" USING gin ("category_ids");

-- Keeps category_ids and category_id in step, de-duplicates the list (first
-- position wins) and refuses a category from another store.
CREATE OR REPLACE FUNCTION "public"."sync_product_category_ids"()
RETURNS trigger
LANGUAGE plpgsql
SET "search_path" TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF cardinality(NEW.category_ids) = 0 AND NEW.category_id IS NOT NULL THEN
      NEW.category_ids := ARRAY[NEW.category_id];
    END IF;
  ELSIF NEW.category_ids IS DISTINCT FROM OLD.category_ids THEN
    NULL; -- the list was written: it is the source of truth
  ELSIF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    -- Only the main category was written (older code): swap it in, keep the rest.
    NEW.category_ids :=
      (CASE WHEN NEW.category_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[NEW.category_id] END)
      || array_remove(array_remove(OLD.category_ids, OLD.category_id), NEW.category_id);
  ELSE
    RETURN NEW;
  END IF;

  NEW.category_ids := COALESCE((
    SELECT array_agg(c ORDER BY pos)
      FROM (SELECT c, min(ord) AS pos
              FROM unnest(NEW.category_ids) WITH ORDINALITY AS u(c, ord)
             WHERE c IS NOT NULL
             GROUP BY c) s
  ), '{}'::uuid[]);
  NEW.category_id := NEW.category_ids[1];

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.category_ids) AS c
     WHERE NOT EXISTS (
       SELECT 1 FROM public.categories k WHERE k.id = c AND k.store_id = NEW.store_id
     )
  ) THEN
    RAISE EXCEPTION 'A selected category does not belong to this store. Refresh the page and choose the categories again.'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "products_sync_category_ids" ON "public"."products";
CREATE TRIGGER "products_sync_category_ids"
  BEFORE INSERT OR UPDATE OF "category_ids", "category_id" ON "public"."products"
  FOR EACH ROW EXECUTE FUNCTION "public"."sync_product_category_ids"();

-- A deleted category drops out of every product that listed it. (A product's
-- main category still can't be deleted — products_category_id_fkey blocks
-- that exactly as before.)
CREATE OR REPLACE FUNCTION "public"."remove_deleted_category_from_products"()
RETURNS trigger
LANGUAGE plpgsql
SET "search_path" TO 'public'
AS $$
BEGIN
  UPDATE public.products
     SET category_ids = array_remove(category_ids, OLD.id)
   WHERE store_id = OLD.store_id
     AND category_ids @> ARRAY[OLD.id];
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS "categories_remove_from_products" ON "public"."categories";
CREATE TRIGGER "categories_remove_from_products"
  AFTER DELETE ON "public"."categories"
  FOR EACH ROW EXECUTE FUNCTION "public"."remove_deleted_category_from_products"();

NOTIFY pgrst, 'reload schema';
