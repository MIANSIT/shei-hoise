#!/bin/sh
# Runs the full Cloud -> self-hosted data migration in the order that matters:
#   1. migrate-auth.mjs           — auth users via Admin API (builds ID mapping)
#   2. migrate-public-data.sh     — all public-schema table rows (pg_dump/restore)
#   3. fix-image-urls.sh          — rewrites stored image/avatar URLs to the new storage host
#   4. fix-auth-id-references.mjs — repoints auth_user_id/user_id at the new ids
#   5. migrate-storage.mjs        — copies every bucket's files
#
# Requires the target stack's schema already bootstrapped (apply-migrations.sh
# and create-buckets.sh already run) — this script only moves data.
#
# Usage:
#   OLD_URL='https://<source-ref>.supabase.co' \
#   OLD_KEY='<source service_role key>' \
#   SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' \
#   docker/scripts/migrate-data/run-all.sh [dev|prod]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$DOCKER_DIR/.." && pwd)"

. "$DOCKER_DIR/scripts/lib-env.sh" "$1"
echo "Target: $ENV_NAME ($ENV_FILE)"

set -a
. "$ENV_FILE"
set +a

if [ -z "$OLD_URL" ] || [ -z "$OLD_KEY" ] || [ -z "$SOURCE_DB_URL" ]; then
  echo "Error: OLD_URL, OLD_KEY, and SOURCE_DB_URL must all be set. Example:" >&2
  echo "  OLD_URL='https://<ref>.supabase.co' OLD_KEY='<service_role_key>' \\" >&2
  echo "  SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' \\" >&2
  echo "  $0 $ENV_NAME" >&2
  exit 1
fi

NEW_URL="$SUPABASE_PUBLIC_URL"
NEW_KEY="$SERVICE_ROLE_KEY"

cd "$REPO_ROOT"

echo "== 1/5: migrating auth users =="
OLD_URL="$OLD_URL" OLD_KEY="$OLD_KEY" NEW_URL="$NEW_URL" NEW_KEY="$NEW_KEY" \
  node "$SCRIPT_DIR/migrate-auth.mjs"

echo "== 2/5: migrating public schema data =="
SOURCE_DB_URL="$SOURCE_DB_URL" "$SCRIPT_DIR/migrate-public-data.sh" "$ENV_NAME"

echo "== 3/5: rewriting stored image/avatar URLs to the new storage host =="
OLD_HOST="$OLD_URL" "$SCRIPT_DIR/fix-image-urls.sh" "$ENV_NAME"

echo "== 4/5: fixing auth ID references =="
NEW_URL="$NEW_URL" NEW_KEY="$NEW_KEY" \
  node "$SCRIPT_DIR/fix-auth-id-references.mjs"

echo "== 5/5: migrating storage files =="
OLD_URL="$OLD_URL" OLD_KEY="$OLD_KEY" NEW_URL="$NEW_URL" NEW_KEY="$NEW_KEY" \
  node "$SCRIPT_DIR/migrate-storage.mjs"

echo ""
echo "Data migration complete against $ENV_NAME ($NEW_URL)."
