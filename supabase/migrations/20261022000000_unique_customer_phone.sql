-- One customer per phone number.
--
-- store_customers.phone had no unique constraint and was saved in whatever
-- shape it was typed (01712345678, 8801712345678, +8801712345678,
-- 01712-345678), so the same person could exist several times and a due or
-- order history was split across the copies.
--
-- 1. normalize_phone() turns every shape into the local 01XXXXXXXXX form.
-- 2. Existing phones are normalized, and customers sharing a phone are merged
--    into the oldest one: everything pointing at a duplicate is moved to it,
--    then the duplicate is deleted.
-- 3. A unique index plus a trigger keep it that way for every write path.
--
-- Run the duplicate check first and look at it:
--   SELECT public.normalize_phone(phone) AS phone, count(*), array_agg(id)
--   FROM public.store_customers
--   WHERE public.normalize_phone(phone) IS NOT NULL
--   GROUP BY 1 HAVING count(*) > 1;

CREATE OR REPLACE FUNCTION "public"."normalize_phone"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN d ~ '^8801[0-9]{9}$' THEN '0' || substr(d, 4)
    WHEN d ~ '^1[0-9]{9}$' THEN '0' || d
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce("p", ''), '\D', '', 'g') AS d) s;
$$;

-- Safety net, because this runs on the live database. For every merge:
--   store_customer_phone_merges      the deleted customer row + who it went to
--   store_customer_phone_merge_rows  every row that was moved (orders, payments,
--                                    links, ...) as it was before the move
-- With both, a merge can be undone by re-inserting the customer and pointing
-- the moved rows back. No policies: SQL editor / service role only.
CREATE TABLE IF NOT EXISTS "public"."store_customer_phone_merges" (
    "duplicate_id" "uuid" NOT NULL,
    "kept_id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "duplicate_row" "jsonb" NOT NULL,
    "merged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "store_customer_phone_merges_pkey" PRIMARY KEY ("duplicate_id")
);
ALTER TABLE "public"."store_customer_phone_merges" OWNER TO "postgres";
ALTER TABLE "public"."store_customer_phone_merges" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."store_customer_phone_merge_rows" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "duplicate_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "column_name" "text" NOT NULL,
    "row_data" "jsonb" NOT NULL
);
ALTER TABLE "public"."store_customer_phone_merge_rows" OWNER TO "postgres";
ALTER TABLE "public"."store_customer_phone_merge_rows" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  g record;
  dup uuid;
  fk record;
  r record;
  d_name text;
  d_email text;
  d_auth uuid;
  d_profile uuid;
BEGIN
  -- Normalize first so equal numbers compare equal.
  UPDATE public.store_customers
  SET phone = public.normalize_phone(phone)
  WHERE phone IS DISTINCT FROM public.normalize_phone(phone);

  FOR g IN
    SELECT phone, array_agg(id ORDER BY created_at NULLS LAST, id) AS ids
    FROM public.store_customers
    WHERE phone IS NOT NULL
    GROUP BY phone
    HAVING count(*) > 1
  LOOP
    FOREACH dup IN ARRAY g.ids[2:array_length(g.ids, 1)] LOOP
      -- Fill gaps on the kept customer from the duplicate.
      -- email is unique, so release it from the duplicate before the kept
      -- customer takes it.
      SELECT name, email, auth_user_id, profile_id
      INTO d_name, d_email, d_auth, d_profile
      FROM public.store_customers WHERE id = dup;

      INSERT INTO public.store_customer_phone_merges (duplicate_id, kept_id, phone, duplicate_row)
      SELECT c.id, g.ids[1], g.phone, to_jsonb(c)
      FROM public.store_customers c WHERE c.id = dup;

      UPDATE public.store_customers
      SET email = NULL, auth_user_id = NULL
      WHERE id = dup;

      UPDATE public.store_customers
      SET name = COALESCE(name, d_name),
          email = COALESCE(email, d_email),
          auth_user_id = COALESCE(auth_user_id, d_auth),
          profile_id = COALESCE(profile_id, d_profile)
      WHERE id = g.ids[1];

      -- Move every row that references the duplicate to the kept customer.
      FOR fk IN
        SELECT c.conrelid::regclass AS tbl, a.attname AS col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.confrelid = 'public.store_customers'::regclass
          AND c.conrelid <> 'public.store_customers'::regclass
      LOOP
        EXECUTE format(
          'INSERT INTO public.store_customer_phone_merge_rows (duplicate_id, table_name, column_name, row_data)
           SELECT $1, %L, %L, to_jsonb(t) FROM %s t WHERE t.%I = $1',
          fk.tbl::text, fk.col, fk.tbl, fk.col
        ) USING dup;

        BEGIN
          EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.tbl, fk.col, fk.col)
            USING g.ids[1], dup;
        EXCEPTION WHEN unique_violation THEN
          -- The kept customer already has an equivalent row (same store link,
          -- same review, same rollup row): move what fits, drop the repeat.
          FOR r IN EXECUTE format('SELECT ctid FROM %s WHERE %I = $1', fk.tbl, fk.col) USING dup LOOP
            BEGIN
              EXECUTE format('UPDATE %s SET %I = $1 WHERE ctid = $2', fk.tbl, fk.col)
                USING g.ids[1], r.ctid;
            EXCEPTION WHEN unique_violation THEN
              EXECUTE format('DELETE FROM %s WHERE ctid = $1', fk.tbl) USING r.ctid;
            END;
          END LOOP;
        END;
      END LOOP;

      DELETE FROM public.store_customers WHERE id = dup;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "store_customers_phone_key"
  ON "public"."store_customers" ("phone")
  WHERE "phone" IS NOT NULL;

-- Every write path (checkout, dashboard, Quick Sale, signup) stores the same shape.
CREATE OR REPLACE FUNCTION "public"."store_customers_normalize_phone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.phone := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "store_customers_normalize_phone" ON "public"."store_customers";
CREATE TRIGGER "store_customers_normalize_phone"
  BEFORE INSERT OR UPDATE OF "phone" ON "public"."store_customers"
  FOR EACH ROW EXECUTE FUNCTION "public"."store_customers_normalize_phone"();
