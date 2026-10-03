-- Branch Hubs: the Customers page per branch.
--
-- A branch's customers are the store's customers who have at least one
-- order in that branch. Paged and searched in the database, returning only
-- one page of customer ids — the app then loads just those rows, so a big
-- store never sends its whole customer list in a URL.
--
-- Requires 20261003000000 (orders.branch_id) and 20261004000000
-- (can_view_store_branch).

CREATE INDEX IF NOT EXISTS "orders_store_branch_customer_idx"
  ON "public"."orders" ("store_id", "branch_id", "customer_id");

CREATE OR REPLACE FUNCTION "public"."get_branch_customer_page"(
    "p_store_id" "uuid",
    "p_branch_id" "uuid",
    "p_search" "text" DEFAULT NULL,
    "p_offset" integer DEFAULT 0,
    "p_limit" integer DEFAULT 10
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_term text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_total integer;
  v_ids jsonb;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'customers.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  WITH matching AS (
    SELECT sc.id, sc.created_at
    FROM public.store_customer_links l
    JOIN public.store_customers sc ON sc.id = l.customer_id
    WHERE l.store_id = p_store_id
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.store_id = p_store_id AND o.branch_id = p_branch_id AND o.customer_id = sc.id
      )
      AND (
        v_term IS NULL
        OR sc.name ILIKE '%' || v_term || '%'
        OR sc.email ILIKE '%' || v_term || '%'
        OR sc.phone ILIKE '%' || v_term || '%'
      )
  )
  SELECT
    (SELECT COUNT(*) FROM matching),
    COALESCE((
      SELECT jsonb_agg(id ORDER BY created_at DESC)
      FROM (
        SELECT id, created_at FROM matching
        ORDER BY created_at DESC
        OFFSET GREATEST(p_offset, 0) LIMIT GREATEST(LEAST(p_limit, 200), 1)
      ) page
    ), '[]'::jsonb)
  INTO v_total, v_ids;

  RETURN jsonb_build_object('total', v_total, 'ids', v_ids);
END;
$$;
ALTER FUNCTION "public"."get_branch_customer_page"("uuid", "uuid", "text", integer, integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_branch_customer_page"("uuid", "uuid", "text", integer, integer) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_branch_customer_page"("uuid", "uuid", "text", integer, integer) TO "authenticated";
