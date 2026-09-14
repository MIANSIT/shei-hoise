-- Manual storefront ordering for the catalog: lets a shop owner drag rows in
-- the dashboard to decide which product shows first, second and so on.
--
-- Bundles are rows in `products` with product_type = 'bundle', so this one
-- column covers bundles too — no second migration for them.
--
-- NULL means "never dragged". Those rows keep falling back to newest-first,
-- so every existing catalog renders exactly as it does today until an owner
-- actually drags something.

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "sort_order" integer;

CREATE INDEX IF NOT EXISTS "idx_products_store_id_sort_order"
  ON "public"."products" USING "btree" ("store_id", "sort_order");

-- Starting order for every existing catalog: A–Z by name, per store. From
-- then on the owner's drags own the order. Only fills rows that have no
-- position yet, so re-running this file can never undo someone's drags.
WITH "ranked" AS (
  SELECT "id",
         "row_number"() OVER (
           PARTITION BY "store_id"
           ORDER BY "lower"("name"), "id"
         ) - 1 AS "rn"
  FROM "public"."products"
)
UPDATE "public"."products" "p"
SET "sort_order" = "ranked"."rn"
FROM "ranked"
WHERE "p"."id" = "ranked"."id"
  AND "p"."sort_order" IS NULL;

-- One round trip for a whole reorder: each id's position in p_ordered_ids
-- becomes its sort_order. Scoped to p_store_id so a tampered id list can't
-- reach another tenant's catalog even though the function is SECURITY DEFINER.
CREATE OR REPLACE FUNCTION "public"."reorder_products"(
  "p_store_id" "uuid",
  "p_ordered_ids" "uuid"[]
) RETURNS void
LANGUAGE "sql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  UPDATE public.products p
  SET sort_order = x.ord - 1,
      updated_at = now()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  WHERE p.id = x.id
    AND p.store_id = p_store_id;
$$;

-- Only the server action (service role) may reorder — the storefront and the
-- browser-side admin session have no business calling this directly.
REVOKE ALL ON FUNCTION "public"."reorder_products"("uuid", "uuid"[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."reorder_products"("uuid", "uuid"[]) FROM "anon";
REVOKE ALL ON FUNCTION "public"."reorder_products"("uuid", "uuid"[]) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."reorder_products"("uuid", "uuid"[]) TO "service_role";
