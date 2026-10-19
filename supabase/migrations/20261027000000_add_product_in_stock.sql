-- SECURITY DEFINER because bundle_items has RLS with no storefront policy (the app
-- reads it through the service role); the function only ever returns a boolean.
-- Storefront "In stock / Out of stock" filter.
-- PostgREST exposes this as a computed column on products, so the shop page can
-- filter with product_in_stock = true/false in the same query that pages the
-- list (a client-side filter would break paging and the product count).
--   * bundle:  every slot (a fixed component, or a group of alternatives) has
--              at least one sellable option — same rule as getBundleAvailabilityMap
--   * variants: at least one active variant has stock
--   * simple:  the product's own inventory row has stock
CREATE OR REPLACE FUNCTION "public"."product_in_stock"("p" "public"."products")
RETURNS boolean
LANGUAGE "sql" STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT CASE
    WHEN p.product_type = 'bundle' THEN
      EXISTS (SELECT 1 FROM public.bundle_items b WHERE b.bundle_product_id = p.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.bundle_items bi
        WHERE bi.bundle_product_id = p.id
        GROUP BY COALESCE(bi.option_group_id::text, bi.id::text)
        HAVING NOT bool_or(
          COALESCE((
            SELECT i.quantity_available
            FROM public.product_inventory i
            WHERE i.product_id = bi.component_product_id
              AND i.variant_id IS NOT DISTINCT FROM bi.component_variant_id
            LIMIT 1
          ), 0) >= GREATEST(bi.quantity_needed, 1)
        )
      )
    WHEN EXISTS (
      SELECT 1 FROM public.product_variants v
      WHERE v.product_id = p.id AND v.is_active
    ) THEN
      EXISTS (
        SELECT 1
        FROM public.product_variants v
        JOIN public.product_inventory i ON i.variant_id = v.id
        WHERE v.product_id = p.id AND v.is_active AND i.quantity_available > 0
      )
    ELSE
      EXISTS (
        SELECT 1 FROM public.product_inventory i
        WHERE i.product_id = p.id AND i.variant_id IS NULL AND i.quantity_available > 0
      )
  END
$$;

NOTIFY pgrst, 'reload schema';
