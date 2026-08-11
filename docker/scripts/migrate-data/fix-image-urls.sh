#!/bin/sh
# Rewrites stored image/avatar URLs from the source Supabase Cloud project's
# hostname to the target stack's storage hostname, after migrate-public-data.sh
# has copied the row data in.
#
# Same pattern as supabase/migrations/20260715000000_fix_dead_supabase_project_image_urls.sql
# (which itself says "reusable for the next project migration: just change
# old_host/new_host and re-run") — extended to also cover categories.image_url,
# customer_profiles.avatar_url, and user_profiles.avatar_url, which had zero
# rows during that migration's original run but may well have real rows now
# that we're pulling in actual current production data.
#
# Storage-API preserves Supabase's URL shape (`/storage/v1/object/public/<bucket>/<path>`)
# whether self-hosted or cloud, so this is a pure hostname swap — no path rewrite needed.
#
# Usage:
#   OLD_HOST='https://<source-ref>.supabase.co' \
#   docker/scripts/migrate-data/fix-image-urls.sh [dev|prod]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

. "$DOCKER_DIR/scripts/lib-env.sh" "$1"
echo "Target: $ENV_NAME ($ENV_FILE)"

set -a
. "$ENV_FILE"
set +a

if [ -z "$OLD_HOST" ]; then
  echo "Error: OLD_HOST is not set. Example:" >&2
  echo "  OLD_HOST='https://<source-ref>.supabase.co' $0 $ENV_NAME" >&2
  exit 1
fi

NEW_HOST="$SUPABASE_PUBLIC_URL"
echo "Rewriting stored URLs: $OLD_HOST -> $NEW_HOST"

docker exec -i shei-hoise-db psql -v ON_ERROR_STOP=1 -U postgres -d "${POSTGRES_DB}" <<SQL
DO \$\$
DECLARE
  old_host CONSTANT text := '${OLD_HOST}';
  new_host CONSTANT text := '${NEW_HOST}';
  updated_count integer;
BEGIN
  UPDATE "public"."product_images"
  SET "image_url" = replace("image_url", old_host, new_host)
  WHERE "image_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'product_images.image_url rows updated: %', updated_count;

  UPDATE "public"."stores"
  SET "logo_url" = replace("logo_url", old_host, new_host)
  WHERE "logo_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'stores.logo_url rows updated: %', updated_count;

  UPDATE "public"."stores"
  SET "banner_url" = replace("banner_url", old_host, new_host)
  WHERE "banner_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'stores.banner_url rows updated: %', updated_count;

  UPDATE "public"."categories"
  SET "image_url" = replace("image_url", old_host, new_host)
  WHERE "image_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'categories.image_url rows updated: %', updated_count;

  UPDATE "public"."customer_profiles"
  SET "avatar_url" = replace("avatar_url", old_host, new_host)
  WHERE "avatar_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'customer_profiles.avatar_url rows updated: %', updated_count;

  UPDATE "public"."user_profiles"
  SET "avatar_url" = replace("avatar_url", old_host, new_host)
  WHERE "avatar_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'user_profiles.avatar_url rows updated: %', updated_count;
END \$\$;
SQL

echo "Done."
