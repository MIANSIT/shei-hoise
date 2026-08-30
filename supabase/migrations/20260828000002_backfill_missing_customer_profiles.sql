-- A batch of customer accounts migrated from an old system (auth.users rows
-- tagged with raw_app_meta_data._migrated_from_id) never got a matching
-- store_customers row created. Their auth account is real and confirmed,
-- but the storefront login flow only recognizes existing customers via
-- store_customers — so these accounts get bounced to signup on every login
-- attempt, even though they already exist.
--
-- Scoped to accounts explicitly tagged role: "customer" with no dashboard
-- users row, so vendor/store-owner accounts sharing the same migrated-auth
-- shape (identifiable by having a users row, or no role tag at all) are
-- left untouched. Idempotent — safe to re-run.

INSERT INTO "public"."store_customers" ("auth_user_id", "email", "phone", "name", "is_active")
SELECT
  "u"."id",
  "u"."email",
  NULLIF("u"."raw_user_meta_data" ->> 'phone', ''),
  NULLIF("u"."raw_user_meta_data" ->> 'name', ''),
  true
FROM "auth"."users" "u"
WHERE "u"."raw_user_meta_data" ->> 'role' = 'customer'
  AND "u"."email" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "public"."users" "du" WHERE "du"."id" = "u"."id")
  AND NOT EXISTS (
    SELECT 1 FROM "public"."store_customers" "sc"
    WHERE "sc"."auth_user_id" = "u"."id" OR lower("sc"."email") = lower("u"."email")
  );
