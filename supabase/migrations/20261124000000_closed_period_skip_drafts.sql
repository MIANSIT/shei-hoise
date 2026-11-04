-- Draft records are not part of a closed month.
--
-- 20261121 locks records dated in a closed month. A saved draft order (a purchase with status
-- "draft") or a draft vendor order has not happened yet: it adds no stock, bill or sale. Without
-- this change, a draft saved late in a month could not be received or deleted once that month was
-- closed. This replaces the one trigger function so a row whose status is "draft" is skipped.
-- A draft that becomes a real record inside a closed month is still refused, because the new
-- row is then no longer a draft.
--
-- Same name and arguments as in 20261121, so the existing triggers pick it up. Additive.
-- Requires 20261121000000_lock_closed_months.sql.
CREATE OR REPLACE FUNCTION "public"."enforce_closed_period"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_col text := TG_ARGV[0];
  v_row jsonb;
  v_date date;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_row := to_jsonb(OLD);
    -- Deleting a whole store removes its rows one by one: that is not an edit of a closed month.
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (v_row ->> 'store_id')::uuid) THEN
      RETURN OLD;
    END IF;
    IF COALESCE(v_row ->> 'status', '') <> 'draft' THEN
      v_date := NULLIF(v_row ->> v_col, '')::date;
      IF public.is_period_closed((v_row ->> 'store_id')::uuid, NULLIF(v_row ->> 'branch_id', '')::uuid, v_date) THEN
        PERFORM public.raise_period_closed(v_date);
      END IF;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_row := to_jsonb(NEW);
    IF COALESCE(v_row ->> 'status', '') <> 'draft' THEN
      v_date := NULLIF(v_row ->> v_col, '')::date;
      IF public.is_period_closed((v_row ->> 'store_id')::uuid, NULLIF(v_row ->> 'branch_id', '')::uuid, v_date) THEN
        PERFORM public.raise_period_closed(v_date);
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."enforce_closed_period"() OWNER TO "postgres";
